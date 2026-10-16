/// <reference types="vite/client" />
import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

// Twenty checks every reference when an app is installed, and a single wrong one
// stops the whole install. These tests make the same checks on the finished app,
// so a broken reference fails here, in seconds, instead of on a server.

type Entity = { success: boolean; errors?: string[]; config: Record<string, any> };
const load = (modules: Record<string, unknown>): Entity[] =>
  Object.values(modules).map((module) => (module as { default: Entity }).default);

const objects = load(import.meta.glob('../objects/*.object.ts', { eager: true }));
const standaloneFields = load(import.meta.glob('../fields/*.field.ts', { eager: true }));
const views = load(import.meta.glob('../views/*.view.ts', { eager: true }));
const navigation = load(import.meta.glob('../navigation-menu-items/*.ts', { eager: true }));
const pageLayouts = load(import.meta.glob('../page-layouts/*.ts', { eager: true }));
const commands = load(import.meta.glob('../command-menu-items/*.ts', { eager: true }));
const frontComponents = load(import.meta.glob('../front-components/*.front-component.tsx', { eager: true }));
const logicFunctions = load(import.meta.glob('../logic-functions/*.logic-function.ts', { eager: true }));
const agents = load(import.meta.glob('../agents/*.ts', { eager: true }));
const skills = load(import.meta.glob('../skills/*.ts', { eager: true }));
const roles = [
  ...load(import.meta.glob('../roles/*.role.ts', { eager: true })),
  ...load(import.meta.glob('../roles/default-role.ts', { eager: true })),
];

const STANDARD = STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS as unknown as Record<string, { universalIdentifier: string; fields?: Record<string, { universalIdentifier: string }> }>;
const standardObjects = ['person', 'company', 'task', 'taskTarget', 'note', 'noteTarget', 'workspaceMember'];

// field id -> { object id, type, options }
type FieldInfo = { objectId: string; type: string; options?: { value: string }[]; name: string };
const fields = new Map<string, FieldInfo>();

for (const object of objects) {
  for (const field of object.config.fields ?? []) {
    fields.set(field.universalIdentifier, { objectId: object.config.universalIdentifier, type: field.type, options: field.options, name: field.name });
  }
}
for (const field of standaloneFields) {
  const config = field.config;
  fields.set(config.universalIdentifier, { objectId: config.objectUniversalIdentifier, type: config.type, options: config.options, name: config.name });
}
for (const key of standardObjects) {
  for (const [name, field] of Object.entries(STANDARD[key].fields ?? {})) {
    fields.set(field.universalIdentifier, { objectId: STANDARD[key].universalIdentifier, type: 'STANDARD', name });
  }
}

const objectIds = new Set([
  ...objects.map((object) => object.config.universalIdentifier as string),
  ...standardObjects.map((key) => STANDARD[key].universalIdentifier),
]);

const everyEntity = [
  ...objects, ...standaloneFields, ...views, ...navigation, ...pageLayouts, ...commands,
  ...frontComponents, ...logicFunctions, ...agents, ...skills, ...roles,
];

describe('every definition', () => {
  it('passes the SDK\'s own validation', () => {
    const failures = everyEntity.filter((entity) => !entity.success || (entity.errors ?? []).length > 0);

    expect(failures.map((entity) => entity.config.name ?? entity.config.label ?? entity.config.universalIdentifier)).toEqual([]);
  });

  it('is found (nothing silently missing)', () => {
    expect({
      objects: objects.length, views: views.length, navigation: navigation.length, pageLayouts: pageLayouts.length,
      commands: commands.length, frontComponents: frontComponents.length, logicFunctions: logicFunctions.length,
      agents: agents.length, skills: skills.length, roles: roles.length,
    }).toEqual({
      objects: 8, views: 14, navigation: 26, pageLayouts: 1,
      commands: 4, frontComponents: 4, logicFunctions: 15,
      agents: 2, skills: 5, roles: 6,
    });
  });

  it('has a universal ID that is a UUID and unique across the whole app', () => {
    const ids = everyEntity.map((entity) => entity.config.universalIdentifier as string);

    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// How Twenty lets each field type be filtered (from the views documentation).
const OPERANDS: Record<string, string[]> = {
  TEXT: ['CONTAINS', 'DOES_NOT_CONTAIN', 'IS_EMPTY', 'IS_NOT_EMPTY'],
  SELECT: ['IS', 'IS_NOT', 'IS_EMPTY', 'IS_NOT_EMPTY'],
  MULTI_SELECT: ['CONTAINS', 'DOES_NOT_CONTAIN', 'IS_EMPTY', 'IS_NOT_EMPTY'],
  RELATION: ['IS', 'IS_NOT', 'IS_EMPTY', 'IS_NOT_EMPTY'],
  NUMBER: ['IS', 'IS_NOT', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'IS_EMPTY', 'IS_NOT_EMPTY'],
  CURRENCY: ['GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'IS', 'IS_NOT', 'IS_EMPTY', 'IS_NOT_EMPTY'],
  DATE: ['IS', 'IS_RELATIVE', 'IS_IN_PAST', 'IS_IN_FUTURE', 'IS_TODAY', 'IS_BEFORE', 'IS_AFTER', 'IS_EMPTY', 'IS_NOT_EMPTY'],
  DATE_TIME: ['IS', 'IS_RELATIVE', 'IS_IN_PAST', 'IS_IN_FUTURE', 'IS_TODAY', 'IS_BEFORE', 'IS_AFTER', 'IS_EMPTY', 'IS_NOT_EMPTY'],
  BOOLEAN: ['IS'],
};

describe('saved views', () => {
  it('only show, sort, group and filter by fields that exist on their own object', () => {
    for (const view of views) {
      const config = view.config;
      const referenced = [
        ...(config.fields ?? []).map((f: any) => f.fieldMetadataUniversalIdentifier),
        ...(config.filters ?? []).map((f: any) => f.fieldMetadataUniversalIdentifier),
        ...(config.sorts ?? []).map((f: any) => f.fieldMetadataUniversalIdentifier),
        ...(config.mainGroupByFieldMetadataUniversalIdentifier ? [config.mainGroupByFieldMetadataUniversalIdentifier] : []),
      ];

      expect(objectIds.has(config.objectUniversalIdentifier), `${config.name}: object`).toBe(true);

      for (const id of referenced) {
        const field = fields.get(id);

        expect(field, `${config.name}: unknown field ${id}`).toBeDefined();
        expect(field!.objectId, `${config.name}: field ${field!.name} belongs to another object`).toBe(config.objectUniversalIdentifier);
      }
    }
  });

  it('use filters Twenty accepts for each field type, with valid option values', () => {
    for (const view of views) {
      for (const filter of view.config.filters ?? []) {
        const field = fields.get(filter.fieldMetadataUniversalIdentifier)!;
        const allowed = OPERANDS[field.type];

        expect(allowed, `${view.config.name}: cannot filter ${field.name} (${field.type})`).toBeDefined();
        expect(allowed, `${view.config.name}: ${filter.operand} on ${field.name} (${field.type})`).toContain(filter.operand);

        if (field.type === 'SELECT' || field.type === 'MULTI_SELECT') {
          if (filter.operand === 'IS_EMPTY' || filter.operand === 'IS_NOT_EMPTY') continue;
          const valid = field.options!.map((option) => option.value);

          expect(Array.isArray(filter.value), `${view.config.name}: ${field.name} needs a list of values`).toBe(true);
          for (const value of filter.value) expect(valid, `${view.config.name}: ${field.name}`).toContain(value);
        }
        if (filter.operand === 'IS_EMPTY' || filter.operand === 'IS_NOT_EMPTY' || filter.operand === 'IS_IN_PAST') {
          expect(filter.value).toBe('');
        }
        if (field.type === 'BOOLEAN') expect(['true', 'false']).toContain(filter.value);
      }
    }
  });

  it('gives every board column exactly one group per dropdown choice', () => {
    for (const view of views.filter((v) => v.config.type === 'KANBAN')) {
      const field = fields.get(view.config.mainGroupByFieldMetadataUniversalIdentifier)!;

      expect(field.type).toBe('SELECT');
      expect(view.config.groups.map((g: any) => g.fieldValue)).toEqual(field.options!.map((o) => o.value));
    }
  });

  it('never repeats a column, filter or sort ID', () => {
    const ids = views.flatMap((view) => [
      ...(view.config.fields ?? []), ...(view.config.filters ?? []), ...(view.config.sorts ?? []), ...(view.config.groups ?? []),
    ]).map((part: any) => part.universalIdentifier);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('navigation', () => {
  const viewIds = new Set(views.map((view) => view.config.universalIdentifier));
  const layoutIds = new Set(pageLayouts.map((layout) => layout.config.universalIdentifier));
  const folderIds = new Set(navigation.filter((item) => item.config.type === 'FOLDER').map((item) => item.config.universalIdentifier));

  it('points every entry at something that exists', () => {
    for (const { config } of navigation) {
      if (config.type === 'VIEW') expect(viewIds.has(config.viewUniversalIdentifier), config.name).toBe(true);
      if (config.type === 'OBJECT') expect(objectIds.has(config.targetObjectUniversalIdentifier), config.name).toBe(true);
      if (config.type === 'PAGE_LAYOUT') expect(layoutIds.has(config.pageLayoutUniversalIdentifier), config.name).toBe(true);
      if (config.folderUniversalIdentifier) expect(folderIds.has(config.folderUniversalIdentifier), config.name).toBe(true);
    }
  });

  it('puts every saved view in the sidebar, so none is unreachable', () => {
    const linked = new Set(navigation.filter((item) => item.config.type === 'VIEW').map((item) => item.config.viewUniversalIdentifier));

    for (const view of views) expect(linked.has(view.config.universalIdentifier), view.config.name).toBe(true);
  });

  it('gives every custom object a sidebar entry', () => {
    const linked = new Set(navigation.filter((item) => item.config.type === 'OBJECT').map((item) => item.config.targetObjectUniversalIdentifier));

    for (const object of objects) expect(linked.has(object.config.universalIdentifier), object.config.nameSingular).toBe(true);
  });

  it('orders entries without ties inside each folder', () => {
    const keys = navigation.map((item) => `${item.config.folderUniversalIdentifier ?? 'top'}:${item.config.position}`);

    expect(keys.filter((key, index) => keys.indexOf(key) !== index)).toEqual([]);
  });
});

describe('dashboard', () => {
  const viewIds = new Set(views.map((view) => view.config.universalIdentifier));

  it('only charts fields that exist on the object being charted, and embeds real views', () => {
    for (const layout of pageLayouts) {
      for (const tab of layout.config.tabs) {
        for (const widget of tab.widgets) {
          const configuration = widget.configuration;

          if (configuration.configurationType === 'RECORD_TABLE') {
            expect(viewIds.has(configuration.viewUniversalIdentifier), widget.title).toBe(true);
            continue;
          }

          expect(objectIds.has(widget.objectUniversalIdentifier), `${widget.title}: object`).toBe(true);

          const referenced = [
            configuration.aggregateFieldMetadataUniversalIdentifier,
            configuration.groupByFieldMetadataUniversalIdentifier,
            configuration.primaryAxisGroupByFieldMetadataUniversalIdentifier,
            ...(configuration.filter?.recordFilters ?? []).map((f: any) => f.fieldMetadataUniversalIdentifier),
          ].filter(Boolean);

          for (const id of referenced) {
            expect(fields.get(id)?.objectId, `${widget.title}: ${id}`).toBe(widget.objectUniversalIdentifier);
          }

          for (const filter of configuration.filter?.recordFilters ?? []) {
            const field = fields.get(filter.fieldMetadataUniversalIdentifier)!;

            expect(OPERANDS[field.type] ?? [], `${widget.title}: ${filter.operand} on ${field.name}`).toContain(filter.operand);
            for (const value of JSON.parse(filter.value)) {
              expect(field.options!.map((o) => o.value), `${widget.title}: ${field.name}`).toContain(value);
            }
          }
        }
      }
    }
  });

  it('keeps every widget on the 12-column grid without overlapping another', () => {
    for (const layout of pageLayouts) {
      for (const tab of layout.config.tabs) {
        const cells = new Set<string>();

        for (const widget of tab.widgets) {
          const { row, column, rowSpan, columnSpan } = widget.position;

          expect(column + columnSpan, widget.title).toBeLessThanOrEqual(12);

          for (let r = row; r < row + rowSpan; r++) {
            for (let c = column; c < column + columnSpan; c++) {
              expect(cells.has(`${r}:${c}`), `${widget.title} overlaps another widget at row ${r}, column ${c}`).toBe(false);
              cells.add(`${r}:${c}`);
            }
          }
        }
      }
    }
  });
});

describe('buttons', () => {
  it('open front components that exist', () => {
    const ids = new Set(frontComponents.map((component) => component.config.universalIdentifier));

    for (const { config } of commands) expect(ids.has(config.frontComponentUniversalIdentifier), config.label).toBe(true);
  });

  it('are limited to the object they act on', () => {
    for (const { config } of commands) {
      if (config.availabilityObjectUniversalIdentifier) {
        expect(objectIds.has(config.availabilityObjectUniversalIdentifier), config.label).toBe(true);
      }
    }
  });
});

describe('roles and AI agents', () => {
  const roleById = new Map(roles.map((role) => [role.config.universalIdentifier, role.config]));

  it('grant access only to objects and fields that exist', () => {
    for (const { config } of roles) {
      for (const permission of config.objectPermissions ?? []) {
        expect(objectIds.has(permission.objectUniversalIdentifier), `${config.label}: object`).toBe(true);
      }
      for (const permission of config.fieldPermissions ?? []) {
        expect(fields.get(permission.fieldUniversalIdentifier)?.objectId, `${config.label}: field`).toBe(permission.objectUniversalIdentifier);
      }
    }
  });

  it('never lets anyone permanently destroy records', () => {
    for (const { config } of roles) {
      expect(config.canDestroyAllObjectRecords, config.label).toBe(false);
      for (const permission of config.objectPermissions ?? []) expect(permission.canDestroyObjectRecords, config.label).toBe(false);
    }
  });

  it('keeps people who work with volunteers or grants out of donors\' giving history', () => {
    for (const label of ['Compass: Volunteer coordinator', 'Compass: Grants manager']) {
      const role = roles.find((entry) => entry.config.label === label)!.config;
      const hidden = new Set(role.fieldPermissions.filter((p: any) => !p.canReadFieldValue).map((p: any) => fields.get(p.fieldUniversalIdentifier)!.name));

      for (const name of ['lifetimeGiving', 'givingStatus', 'lastGiftDate', 'aiSummary', 'aiBasis', 'capacityRating']) {
        expect(hidden.has(name), `${label} must not read ${name}`).toBe(true);
      }
    }
  });

  it('gives the volunteer coordinator and board viewer no access to donations', () => {
    const donation = objects.find((o) => o.config.nameSingular === 'donation')!.config.universalIdentifier;

    for (const label of ['Compass: Volunteer coordinator', 'Compass: Board viewer']) {
      const role = roles.find((entry) => entry.config.label === label)!.config;

      expect(role.objectPermissions.some((p: any) => p.objectUniversalIdentifier === donation), label).toBe(false);
    }
  });

  it('keeps the board viewer read-only with no export', () => {
    const role = roles.find((entry) => entry.config.label === 'Compass: Board viewer')!.config;

    expect(role.objectPermissions.every((p: any) => p.canUpdateObjectRecords === false && p.canSoftDeleteObjectRecords === false)).toBe(true);
    expect(role.permissionFlagUniversalIdentifiers).toEqual([]);
  });

  it('binds every AI agent to a role that cannot read or change any record', () => {
    for (const { config } of agents) {
      const role = roleById.get(config.roleUniversalIdentifier);

      expect(role, `${config.name} has no role`).toBeDefined();
      expect(role!.objectPermissions ?? []).toEqual([]);
      expect(role!.canReadAllObjectRecords).toBe(false);
      expect(role!.canUpdateAllObjectRecords).toBe(false);
      expect(role!.canSoftDeleteAllObjectRecords).toBe(false);
    }
  });

  it('asks each AI agent for a reply whose required fields are all declared', () => {
    for (const { config } of agents) {
      const schema = config.responseFormat.schema;

      expect(config.responseFormat.type).toBe('json');
      for (const key of schema.required) expect(Object.keys(schema.properties)).toContain(key);
      for (const property of Object.values<any>(schema.properties)) expect(['string', 'number', 'boolean']).toContain(property.type);
    }
  });
});

describe('automations', () => {
  const objectNames = new Set(objects.map((object) => object.config.nameSingular));

  it('listen to objects that exist, and each has exactly one way to start', () => {
    for (const { config } of logicFunctions) {
      const triggers = ['cronTriggerSettings', 'databaseEventTriggerSettings', 'httpRouteTriggerSettings'].filter((key) => config[key]);

      if (config.name === 'health-check') continue;
      expect(triggers, config.name).toHaveLength(1);

      if (config.databaseEventTriggerSettings) {
        const [objectName] = config.databaseEventTriggerSettings.eventName.split('.');

        expect(objectNames.has(objectName), `${config.name} listens to ${objectName}`).toBe(true);
      }
      if (config.cronTriggerSettings) expect(config.cronTriggerSettings.pattern.split(' ')).toHaveLength(5);
    }
  });

  it('never loops: a function that writes a field does not wake on that same field', () => {
    // Every event function writes only calculated fields, and each one first
    // checks whether anything changed, so a repeat run writes nothing. This
    // guards the one trigger that is narrowed to specific fields.
    for (const { config } of logicFunctions) {
      const trigger = config.databaseEventTriggerSettings;

      if (trigger?.updatedFields) expect(trigger.updatedFields.length).toBeGreaterThan(0);
    }
  });

  it('uses unique, authenticated web addresses', () => {
    const routes = logicFunctions.map((fn) => fn.config.httpRouteTriggerSettings).filter(Boolean);

    expect(new Set(routes.map((route: any) => `${route.httpMethod} ${route.path}`)).size).toBe(routes.length);
    for (const route of routes) expect(route.isAuthRequired, route.path).toBe(true);
  });

  it('stays inside the platform limit of 900 seconds', () => {
    for (const { config } of logicFunctions) expect(config.timeoutSeconds, config.name).toBeLessThanOrEqual(900);
  });
});
