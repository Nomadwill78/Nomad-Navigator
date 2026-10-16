/// <reference types="vite/client" />
import * as tablerIcons from '@tabler/icons-react';
import { describe, expect, it } from 'vitest';

// Twenty only discovers a broken relation, a duplicate ID or a missing icon when
// the app is installed on a real server. These tests catch the same mistakes
// here, before anything is deployed.

type Entity = { success: boolean; errors?: string[]; config: Record<string, any> };

const load = (modules: Record<string, unknown>): Entity[] =>
  Object.values(modules).map((module) => (module as { default: Entity }).default);

const objects = load(import.meta.glob('../objects/*.object.ts', { eager: true }));
const standaloneFields = load(import.meta.glob('../fields/*.field.ts', { eager: true }));
const views = load(import.meta.glob('../views/*.view.ts', { eager: true }));
const navigation = load(import.meta.glob('../navigation-menu-items/*.ts', { eager: true }));

type FieldConfig = Record<string, any> & { universalIdentifier: string; objectUniversalIdentifier: string };

const allFields: FieldConfig[] = [
  ...objects.flatMap((object) =>
    (object.config.fields ?? []).map((field: Record<string, any>) => ({
      ...field,
      objectUniversalIdentifier: object.config.universalIdentifier,
    })),
  ),
  ...standaloneFields.map((field) => field.config as FieldConfig),
];

describe('definitions are valid', () => {
  it.each([...objects, ...standaloneFields, ...views, ...navigation].map((entity, index) => [index, entity] as const))(
    'entity %s passes the SDK validation',
    (_index, entity) => {
      expect(entity.errors ?? []).toEqual([]);
      expect(entity.success).toBe(true);
    },
  );
});

describe('identifiers', () => {
  it('has no two objects or fields sharing an ID', () => {
    const ids = [...objects.map((o) => o.config.universalIdentifier), ...allFields.map((f) => f.universalIdentifier)];

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no two fields with the same name on the same object', () => {
    const keys = allFields.map((field) => `${field.objectUniversalIdentifier}:${field.name}`);

    expect(keys.filter((key, index) => keys.indexOf(key) !== index)).toEqual([]);
  });

  it('keeps every custom object name and field name out of Twenty\'s reserved words', () => {
    const reserved = ['plan', 'plans', 'type', 'types', 'event', 'events', 'role', 'roles', 'link', 'links', 'field', 'fields', 'object', 'objects', 'index', 'job', 'jobs', 'user', 'users', 'workspace', 'search', 'create', 'connect', 'address', 'currency'];
    const names = [
      ...objects.flatMap((o) => [o.config.nameSingular, o.config.namePlural]),
      ...allFields.map((f) => f.name),
    ];

    expect(names.filter((name) => reserved.includes(name))).toEqual([]);
  });
});

describe('relations', () => {
  const relations = allFields.filter((field) => field.type === 'RELATION');
  const byId = new Map(allFields.map((field) => [field.universalIdentifier, field]));

  it('declares both sides of every relation, pointing at each other', () => {
    expect(relations.length).toBeGreaterThan(0);

    for (const field of relations) {
      const reverse = byId.get(field.relationTargetFieldMetadataUniversalIdentifier);

      expect(reverse, `${field.name}: reverse field is missing`).toBeDefined();
      expect(reverse!.objectUniversalIdentifier, `${field.name}: reverse lives on the wrong object`).toBe(
        field.relationTargetObjectMetadataUniversalIdentifier,
      );
      expect(reverse!.relationTargetFieldMetadataUniversalIdentifier, `${field.name}: reverse does not point back`).toBe(
        field.universalIdentifier,
      );
      expect(reverse!.relationTargetObjectMetadataUniversalIdentifier).toBe(field.objectUniversalIdentifier);
    }
  });

  it('pairs every many-to-one side with a one-to-many side', () => {
    for (const field of relations) {
      const reverse = byId.get(field.relationTargetFieldMetadataUniversalIdentifier)!;
      const kinds = [field.universalSettings.relationType, reverse.universalSettings.relationType].sort();

      expect(kinds, `${field.name} <-> ${reverse.name}`).toEqual(['MANY_TO_ONE', 'ONE_TO_MANY']);
    }
  });

  it('gives every many-to-one side a join column and a delete rule', () => {
    for (const field of relations.filter((r) => r.universalSettings.relationType === 'MANY_TO_ONE')) {
      expect(field.universalSettings.joinColumnName, `${field.name}: join column`).toMatch(/^[a-z][A-Za-z]+Id$/);
      expect(['CASCADE', 'SET_NULL', 'RESTRICT', 'NO_ACTION']).toContain(field.universalSettings.onDelete);
    }
  });

  it('never deletes a donation just because a donor, campaign or grant was removed', () => {
    const donationObjectId = objects.find((o) => o.config.nameSingular === 'donation')!.config.universalIdentifier;
    const donationRelations = relations.filter(
      (r) => r.objectUniversalIdentifier === donationObjectId && r.universalSettings.relationType === 'MANY_TO_ONE',
    );

    expect(donationRelations.length).toBe(4);
    for (const relation of donationRelations) {
      expect(relation.universalSettings.onDelete, relation.name).toBe('SET_NULL');
    }
  });
});

describe('select fields', () => {
  it('have unique option values and positions', () => {
    for (const field of allFields.filter((f) => f.type === 'SELECT' || f.type === 'MULTI_SELECT')) {
      const values = field.options.map((o: { value: string }) => o.value);
      const positions = field.options.map((o: { position: number }) => o.position);

      expect(new Set(values).size, `${field.name} values`).toBe(values.length);
      expect(new Set(positions).size, `${field.name} positions`).toBe(positions.length);
    }
  });

  it('only use a default that is one of the options', () => {
    for (const field of allFields.filter((f) => f.type === 'SELECT' && f.defaultValue)) {
      const values = field.options.map((o: { value: string }) => `'${o.value}'`);

      expect(values, field.name).toContain(field.defaultValue);
    }
  });
});

describe('icons', () => {
  it('only uses icons that exist, so nothing renders blank', () => {
    const icons = [
      ...objects.map((o) => o.config.icon),
      ...allFields.map((f) => f.icon),
      ...views.map((v) => v.config.icon),
      ...navigation.map((n) => n.config.icon),
    ].filter((icon): icon is string => typeof icon === 'string');

    const missing = [...new Set(icons)].filter((icon) => !(icon in tablerIcons));

    expect(missing).toEqual([]);
  });
});
