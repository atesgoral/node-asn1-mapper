const CLS_UNIVERSAL = 0;
const CLS_APPLICATION_WIDE = 1;
const CLS_CONTEXT_SPECIFIC = 2;
const CLS_PRIVATE_USE = 3;

const FORM_PRIMITIVE = 0;
const FORM_CONSTRUCTED = 1;

const universalTagMap = {
  'BOOLEAN': 1,
  'INTEGER': 2,
  'BIT STRING': 3,
  'OCTET STRING': 4,
  'NULL': 5,
  'OBJECT IDENTIFIER': 6,
  'ObjectDescriptor': 7,
  'INSTANCE OF': 8,
  'EXTERNAL': 8,
  'REAL': 9,
  'ENUMERATED': 10,
  'EMBEDDED PDV': 11,
  'UTF8String': 12,
  'RELATIVE-OID': 13,
  'SEQUENCE': 16,
  'SEQUENCE OF': 16,
  'SET': 17,
  'SET OF': 17,
  'NumericString': 18,
  'PrintableString': 19,
  'TeletexString': 20,
  'T61String': 20,
  'VideotexString': 21,
  'IA5String': 22,
  'UTCTime': 23,
  'GeneralizedTime': 24,
  'GraphicString': 25,
  'VisibleString': 26,
  'ISO646String': 26,
  'GeneralString': 27,
  'UniversalString': 28,
  'CHARACTER STRING': 29,
  'BMPString': 30
};

const constructedTypeMap = {
  'SEQUENCE': 1,
  'SEQUENCE OF': 1,
  'SET': 1,
  'SET OF': 1,
  'CHOICE': 1
};

const decoders = {
  'INTEGER': (value) => {
    return value.readIntBE(0, value.length);
  },
  'NULL': () => true,
  'ENUMERATED': (value, definition) => {
    const itemValue = value.readIntBE(0, value.length);
    const item = definition.values.find((item) => itemValue === item.value);
    return item ? item.name : itemValue;
  }
};

const encoders = {
  'INTEGER': (value) => {
    const length = (Math.log2(value) >> 3) + 1;
    const buffer = Buffer.allocUnsafe(length);
    buffer.writeUIntBE(value, 0, length);
    return buffer;
  },
  'NULL': (value) => value ? Buffer.from([]) : null,
  'ENUMERATED': (value, definition) => {
    const item = definition.values.find((item) => value === item.name);
    return Buffer.from([ item.value ]);
  }
}

function fromTree(element, definition) {
  let match = null;
  const isDefinitionUniversal = isNaN(definition.tag);

  if (definition.type === 'CHOICE' && isDefinitionUniversal) {
    let choices = definition.elements; // @todo rename to choices
    let choice = null;

    for (let choiceIdx = 0; choiceIdx < choices.length; choiceIdx++) {
      choice = choices[choiceIdx];
      match = fromTree(element, choice); // This is like a SEQUENCE where all items are optional; could reuse loop below

      if (match !== null) {
        return { [choice.name]: match };
      }
    }

    return null;
  }

  const definitionTag = isDefinitionUniversal
    ? universalTagMap[definition.type]
    : definition.tag;
  const isDefinitionConstructed = constructedTypeMap[definition.type] === 1;

  // @todo resolve to type?
  const isElementUniversal = element.cls === CLS_UNIVERSAL;
  const isElementConstructed = element.form === FORM_CONSTRUCTED;

  if (isDefinitionConstructed !== isElementConstructed) {
    return null;
  }

  if (isDefinitionUniversal !== isElementUniversal) {
    return null;
  }

  if (definitionTag !== element.tagCode) {
    return null;
  }

  if (isDefinitionConstructed) {
    const ofElement = definition.ofElement;

    if (ofElement) {
      match = element.elements
        .map((child) => {
          const match = fromTree(child, ofElement);

          if (match === null) {
            throw new Error('Unmatched element');
          }

          return match;
        });
    } else {
      const definitions = definition.elements; // @todo assert elements.length !== 0?
      let definitionIdx = 0;

      const constructed = {};

      element.elements
        .forEach((child, idx) => {
          let childDefinition = null;
          let match = null;

          while (match === null && definitionIdx < definitions.length) {
            childDefinition = definitions[definitionIdx++];
            match = fromTree(child, childDefinition);

            if (match === null && !childDefinition.optional && definition.type !== 'CHOICE') {
              throw new Error('Unmatched mandatory element');
            }
          }

          if (match !== null) {
            constructed[childDefinition.name] = match;
          } else {
            throw new Error('No definitions found for element.');
          }
        });

      match = constructed;
    }
  } else {
    match = element.value;
  }

  const decoder = decoders[definition.type];

  return decoder ? decoder(match, definition) : match;
}

function toTree(value, definition) { // @todo optional third arg: throw exception on no match instead of returning null?
  if (definition.type === 'CHOICE') {
    // @todo rename elements to choices
    let choice = definition.elements.find((choice) => value.hasOwnProperty(choice.name));

    if (choice) {
      return definition.tag ? {
        cls: CLS_CONTEXT_SPECIFIC,
        form: FORM_CONSTRUCTED,
        tagCode: definition.tag,
        elements: new Array(toTree(value[choice.name], choice))
      } : toTree(value[choice.name], choice);
    }

    throw new Error('Choice not matched');
  }

  const isDefinitionUniversal = isNaN(definition.tag);
  const definitionTag = isDefinitionUniversal
    ? universalTagMap[definition.type]
    : definition.tag;
  const isDefinitionConstructed = constructedTypeMap[definition.type] === 1;

  if (isDefinitionConstructed) {
    const ofElement = definition.ofElement;

    if (ofElement) {
      if (!(value instanceof Array)) {
        throw new Error('Value must be an array');
      }

      return {
        cls: isDefinitionUniversal ? CLS_UNIVERSAL : CLS_CONTEXT_SPECIFIC,
        form: FORM_CONSTRUCTED,
        tagCode: definitionTag,
        elements: value.map((item) => toTree(item, ofElement)) // @todo throw exception if any items are null
      };
    } else {
      if (value.constructor.name !== 'Object') {
        throw new Error('Value must be an object');
      }
      return {
        cls: isDefinitionUniversal ? CLS_UNIVERSAL : CLS_CONTEXT_SPECIFIC,
        form: FORM_CONSTRUCTED,
        tagCode: definitionTag,
        elements: definition.elements
          // @todo check optional flag? (i.e. otherwise need to be aware of CHOICE)
          .filter((childDefinition) => value.hasOwnProperty(childDefinition.name)) // @todo how can they not have names?
          .map((childDefinition) => toTree(value[childDefinition.name], childDefinition))
          .filter((element) => element.value !== null)
      };
    }
  } else {
    const encoder = encoders[definition.type];

    return {
      cls: isDefinitionUniversal ? CLS_UNIVERSAL : CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: definitionTag,
      value: encoder ? encoder(value, definition) : value
    };
  }
}

module.exports = Object.freeze({
  fromTree,
  toTree
});
