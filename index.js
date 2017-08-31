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

function fromTree(element, definition, customDecoders) {
  const isDefinitionUniversal = isNaN(definition.tag);
  const definitionTag = isDefinitionUniversal
    ? universalTagMap[definition.type]
    : definition.tag;
  const isDefinitionConstructed = constructedTypeMap[definition.type] === 1;

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

  if (element.form === FORM_PRIMITIVE) {
    match = element.value;
  } else {
    const definitions = definition.elements;
    let definitionIdx = 0;

    const constructed = {};

    element.elements
      .forEach((child, idx) => {
        let childDefinition = null;
        let match = null;

        // @todo check optional flag

        while (match === null && definitionIdx < definitions.length) {
          childDefinition = definitions[definitionIdx++];
          match = fromTree(child, childDefinition, customDecoders);

          if (match === null && !childDefinition.optional) {
            throw new Error('Unmatchd mandatory element');
          }
        }

        if (match === null) {
          throw new Error('Element not matched');
        }

        constructed[childDefinition.name] = match;
      });

    match = constructed;
  }

  const decoderName = definition.decodeAs || definition.type;
  const decoder = decoders[decoderName] || customDecoders && customDecoders[decoderName];
  return decoder ? decoder(match, definition) : match;
}

module.exports = Object.freeze({
  fromTree
});
