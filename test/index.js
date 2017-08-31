import test from 'ava';

const asn1Mapper = require('..');

const CLS_UNIVERSAL = 0;
const CLS_CONTEXT_SPECIFIC = 2;

const FORM_PRIMITIVE = 0;
const FORM_CONSTRUCTED = 1;

const TAG_OCTET_STRING = 4;
const TAG_NULL = 5;
const TAG_SEQUENCE = 16;

test('fromTree: universal primitive', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_OCTET_STRING,
    value: Buffer.from([ 1, 2, 3 ])
  };
  const definition = {
    type: 'OCTET STRING'
  };
  const mapped = Buffer.from([ 1, 2, 3 ]);

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: context-specific primitive', (t) => {
  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_PRIMITIVE,
    tagCode: 0,
    value: Buffer.from([ 1, 2, 3 ])
  };
  const definition = {
    type: 'OCTET STRING',
    tag: 0
  };
  const mapped = Buffer.from([ 1, 2, 3 ]);

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: universal constructed: single primitive', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }]
  };
  const definition = {
    type: 'SEQUENCE',
    elements: [{
      name: 'foo',
      type: 'OCTET STRING',
    }]
  };
  const mapped = {
    foo: Buffer.from([ 1, 2, 3 ])
  };

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromTree: universal constructed: tagged primitives', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_CONSTRUCTED,
    tagCode: TAG_SEQUENCE,
    elements: [{
      cls: CLS_UNIVERSAL,
      form: FORM_PRIMITIVE,
      tagCode: TAG_OCTET_STRING,
      value: Buffer.from([ 1, 2, 3 ])
    }, {
      cls: CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: 0,
      value: Buffer.from([ 2, 3, 4 ])
    }, {
      cls: CLS_CONTEXT_SPECIFIC,
      form: FORM_PRIMITIVE,
      tagCode: 2,
      value: Buffer.from([ 4, 5, 6 ])
    }]
  };
  const definition = {
    type: 'SEQUENCE',
    elements: [{
      name: 'foo',
      type: 'OCTET STRING',
    }, {
      name: 'bar',
      type: 'OCTET STRING',
      tag: 0,
      implicit: true,
      optional: true
    }, {
      name: 'baz',
      type: 'OCTET STRING',
      tag: 1,
      implicit: true,
      optional: true
    }, {
      name: 'qux',
      type: 'OCTET STRING',
      tag: 2,
      implicit: true,
      optional: true
    }]
  };
  const mapped = {
    foo: Buffer.from([ 1, 2, 3 ]),
    bar: Buffer.from([ 2, 3, 4 ]),
    qux: Buffer.from([ 4, 5, 6 ])
  };

  t.deepEqual(asn1Mapper.fromTree(tree, definition), mapped);
});
