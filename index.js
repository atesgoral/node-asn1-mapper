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
  'NULL': () => true,
  'INTEGER': (value) => {
    return value.readIntBE(0, value.length);
  },
  'ENUMERATED': (value, definition) => {
    const itemValue = value.readIntBE(0, value.length);
    const item = definition.values.find((item) => itemValue === item.value);
    return item ? item.name : itemValue;
  }
};

const encoders = {
  'NULL': (value) => value ? Buffer.from([]) : null,
  'INTEGER': (value) => {
    const length = Math.log2(value) >> 3;
    const buffer = Buffer.allocUnsafe(length);
    buffer.writeUIntBE(value, length);
    return buffer;
  },
  'ENUMERATED': (value, definition) => {
    const item = definition.values.find((item) => value === item.name);
    return Buffer.from([ item.value ]);
  }
}

function fromTree(element, definition) {
  const isDefinitionUniversal = isNaN(definition.tag);
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

  let match = null;

  if (isDefinitionConstructed) {
    const definitions = definition.elements;
    let definitionIdx = 0;

    const constructed = {};

    element.elements
      .forEach((child, idx) => {
        let childDefinition = null;
        let match = null;

        while (match === null && definitionIdx < definitions.length) {
          childDefinition = definitions[definitionIdx++];
          match = fromTree(child, childDefinition);

          if (match === null && !childDefinition.optional) {
            throw new Error('Unmatched mandatory element');
          }
        }

        if (match === null) {
          throw new Error('Element not matched');
        }

        constructed[childDefinition.name] = match;
      });

    match = constructed;
  } else {
    match = element.value;
  }

  const decoder = decoders[definition.type];

  return decoder ? decoder(match, definition) : match;
}

function toTree(value, definition) {
  const isDefinitionUniversal = isNaN(definition.tag);
  const definitionTag = isDefinitionUniversal
    ? universalTagMap[definition.type]
    : definition.tag;
  const isDefinitionConstructed = constructedTypeMap[definition.type] === 1;

  if (isDefinitionConstructed) {
    if (!(value instanceof Object)) {
      throw new Error('Value must be an object');
    }

    const elements = definition.elements
      .filter((childDefinition) => value.hasOwnProperty(childDefinition.name))
      .map((childDefinition) => toTree(value[childDefinition.name], childDefinition))
      .filter((element) => element.value !== null);

    return {
      cls: isDefinitionUniversal ? CLS_UNIVERSAL : CLS_CONTEXT_SPECIFIC,
      form: FORM_CONSTRUCTED,
      tagCode: definitionTag,
      elements
    };
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
