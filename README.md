[![Travis CI](https://img.shields.io/travis/atesgoral/node-asn1-mapper.svg)](https://travis-ci.org/atesgoral/node-asn1-mapper)
[![Coverage Status](https://img.shields.io/coveralls/atesgoral/node-asn1-mapper.svg)](https://coveralls.io/github/atesgoral/node-asn1-mapper?branch=master)
[![NPM Package](https://img.shields.io/npm/v/asn1-mapper.svg)](https://www.npmjs.com/package/asn1-mapper)

# asn1-mapper

ASN.1 schema mapper for semantic translation between [asn1-tree](https://www.npmjs.com/package/asn1-tree) structures and human-readable JavaScript values, using an ASN.1 expanded module definition (schema) that is converted with [asn1exp](https://www.npmjs.com/package/asn1exp) (e.g. [map-modules](https://www.npmjs.com/package/map-modules)).

```
ASN.1 buffer <---> asn1-tree <---> ASN.1 tree structure <---> asn1-mapper <---> JavaScript value
                                 + ASN.1 definition (schema)
```

## Installation

```
npm install --save asn1-mapper
```

## Usage

```
// npm install --save asn1-tree
const asn1Tree = require('asn1-tree');
const asn1Mapper = require('asn1-mapper');
// npm install --save map-modules
const operations = require('map-modules/dist/MAP-MobileServiceOperations.EXP.min.json');

const buffer = Buffer.from('3080800803221200644241f40201028301010000', 'hex');

const tree = asn1Tree.decode(buffer);

const mapped = asn1Mapper.fromTree(tree, operations.sendAuthenticationInfo.argument);
```

The value of `mapped` will be:

```
{
  imsi: Buffer.from('03221200644241f4', 'hex'),
  numberOfRequestedVectors: 2,
  requestingNodeType: 'sgsn'
}
```

Going back:

```
const tree = asn1Mapper.toTree(mapped, operations.sendAuthenticationInfo.argument);
const buffer = asn1Tree.encode(tree);
```

## Notes

### The NULL type

Elements of NULL type are treated as Boolean flags. Just the presence of a NULL element (since its value is zero-sized) will result in a property set to `true`. For example, with the immediateResponsePreferred element of a sendAuthenticationInfo argument, you might end up with:

```
{
  imsi: Buffer.from('03221200644241f4', 'hex'),
  immediateResponsePreferred: true,
  numberOfRequestedVectors: 2,
  requestingNodeType: 'sgsn'
}
```

Going back, all you have to do is to include a property that is set to `true` and it will end up as a NULL element.
