import test from 'ava';

const asn1Mapper = require('..');

const CLS_UNIVERSAL = 0;
const CLS_CONTEXT_SPECIFIC = 2;

const FORM_PRIMITIVE = 0;
const FORM_CONSTRUCTED = 1;

const TAG_INTEGER = 2;
const TAG_OCTET_STRING = 4;
const TAG_NULL = 5;
const TAG_ENUMERATED = 10;
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

test('fromFree: primitive decoding: INTEGER', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_INTEGER,
    value: Buffer.from([ 0x12, 0x34 ])
  };
  const definition = {
    type: 'INTEGER'
  };
  const mapped = 0x1234;

  t.is(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromFree: primitive decoding: NULL', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_NULL,
    value: Buffer.from([])
  };
  const definition = {
    type: 'NULL'
  };
  const mapped = true;

  t.is(asn1Mapper.fromTree(tree, definition), mapped);
});

test('fromFree: primitive decoding: ENUMERATED', (t) => {
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_ENUMERATED,
    value: Buffer.from([ 2 ])
  };
  const definition = {
    type: 'ENUMERATED',
    values: [
      { name: 'one', value: 1 },
      { name: 'two', value: 2 }
    ]
  };
  const mapped = 'two';

  t.is(asn1Mapper.fromTree(tree, definition), mapped);
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

test('toTree: universal primitive', (t) => {
  const mapped = Buffer.from([ 1, 2, 3 ]);
  const definition = {
    type: 'OCTET STRING'
  };
  const tree = {
    cls: CLS_UNIVERSAL,
    form: FORM_PRIMITIVE,
    tagCode: TAG_OCTET_STRING,
    value: Buffer.from([ 1, 2, 3 ])
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: context-specific primitive', (t) => {
  const mapped = Buffer.from([ 1, 2, 3 ]);
  const definition = {
    type: 'OCTET STRING',
    tag: 0
  };
  const tree = {
    cls: CLS_CONTEXT_SPECIFIC,
    form: FORM_PRIMITIVE,
    tagCode: 0,
    value: Buffer.from([ 1, 2, 3 ])
  };

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('toTree: universal constructed: single primitive', (t) => {
  const mapped = {
    foo: Buffer.from([ 1, 2, 3 ])
  };
  const definition = {
    type: 'SEQUENCE',
    elements: [{
      name: 'foo',
      type: 'OCTET STRING',
    }]
  };
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

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});

test('fromTree: universal constructed: tagged primitives', (t) => {
  const mapped = {
    foo: Buffer.from([ 1, 2, 3 ]),
    bar: Buffer.from([ 2, 3, 4 ]),
    qux: Buffer.from([ 4, 5, 6 ])
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

  t.deepEqual(asn1Mapper.toTree(mapped, definition), tree);
});
