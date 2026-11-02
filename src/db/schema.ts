/**
 * Device SQLite schema (Drizzle). Mirrors DATABASE.md §2 (MVP tables) column-for-column so sync
 * can copy rows as-is. SQLite types (DATABASE.md header): uuid → TEXT, timestamptz/date → TEXT
 * (ISO), numeric → REAL, boolean → INTEGER, jsonb → TEXT (JSON), enums → TEXT + CHECK.
 * No RLS or RPCs on the device. Change DATABASE.md first, then this file, then
 * `npm run db:local:generate`.
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// Enum values (DATABASE.md §1).
export const APP_LANGUAGES = ['en', 'gu', 'hi'] as const;
export const MEASUREMENT_UNITS = ['in', 'cm'] as const;
export const ORDER_STATUSES = ['received', 'ready', 'delivered'] as const;
export const PAYMENT_MODES = ['cash', 'upi', 'card'] as const;
export const PLAN_CODES = ['trial', 'pro_monthly', 'pro_yearly'] as const;
export const PLAN_STATUSES = ['trialing', 'active', 'grace', 'expired', 'cancelled'] as const;

const inList = (column: string, values: readonly string[]) =>
  sql.raw(`${column} in (${values.map((v) => `'${v}'`).join(', ')})`);

// Shared columns. Timestamps are ISO strings; the server's updated_at is the sync cursor.
const timestamps = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
};
const softDelete = { deletedAt: text('deleted_at') };

// 2.1 profiles
export const profiles = sqliteTable(
  'profiles',
  {
    id: text('id').primaryKey(),
    fullName: text('full_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    language: text('language', { enum: APP_LANGUAGES }).notNull().default('en'),
    ...timestamps,
  },
  (t) => [check('profiles_language_check', inList('language', APP_LANGUAGES))],
);

// 2.2 shops
export const shops = sqliteTable(
  'shops',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull().unique(),
    name: text('name').notNull(),
    phone: text('phone'),
    gstin: text('gstin'),
    upiId: text('upi_id'),
    defaultGstRate: integer('default_gst_rate').notNull().default(0),
    measurementUnit: text('measurement_unit', { enum: MEASUREMENT_UNITS }).notNull().default('in'),
    weeklyOffDay: integer('weekly_off_day'),
    nextOrderNo: integer('next_order_no').notNull().default(1001),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check('shops_gst_check', sql`${t.defaultGstRate} in (0, 5, 12, 18)`),
    check('shops_unit_check', inList('measurement_unit', MEASUREMENT_UNITS)),
  ],
);

// 2.3 subscriptions (server-written; pulled read-only)
export const subscriptions = sqliteTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    shopId: text('shop_id').notNull().unique(),
    plan: text('plan', { enum: PLAN_CODES }).notNull().default('trial'),
    status: text('status', { enum: PLAN_STATUSES }).notNull().default('trialing'),
    trialEndsAt: text('trial_ends_at').notNull(),
    currentPeriodEnd: text('current_period_end'),
    provider: text('provider').notNull().default('revenuecat'),
    providerCustomerId: text('provider_customer_id'),
    lastEventId: text('last_event_id'),
    ...timestamps,
  },
  (t) => [
    check('subscriptions_plan_check', inList('plan', PLAN_CODES)),
    check('subscriptions_status_check', inList('status', PLAN_STATUSES)),
  ],
);

// 2.4 garment_types
export const garmentTypes = sqliteTable(
  'garment_types',
  {
    id: text('id').primaryKey(),
    shopId: text('shop_id').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    styleOptions: text('style_options', { mode: 'json' })
      .$type<Record<string, string[]>>()
      .notNull()
      .default(sql`'{}'`),
    fabricPerPieceM: real('fabric_per_piece_m').notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('garment_types_shop_name_key')
      .on(t.shopId, sql`lower(${t.name})`)
      .where(sql`${t.deletedAt} is null`),
    index('garment_types_sync_idx').on(t.shopId, t.updatedAt, t.id),
  ],
);

// 2.5 measurement_fields
export const measurementFields = sqliteTable(
  'measurement_fields',
  {
    id: text('id').primaryKey(),
    shopId: text('shop_id').notNull(),
    garmentTypeId: text('garment_type_id')
      .notNull()
      .references(() => garmentTypes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('measurement_fields_garment_name_key')
      .on(t.garmentTypeId, sql`lower(${t.name})`)
      .where(sql`${t.deletedAt} is null`),
    index('measurement_fields_order_idx')
      .on(t.garmentTypeId, t.sortOrder)
      .where(sql`${t.deletedAt} is null`),
    index('measurement_fields_sync_idx').on(t.shopId, t.updatedAt, t.id),
  ],
);

// 2.6 customers
export const customers = sqliteTable(
  'customers',
  {
    id: text('id').primaryKey(),
    shopId: text('shop_id').notNull(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    bookNo: text('book_no'),
    area: text('area'),
    familyRootId: text('family_root_id'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index('customers_sync_idx').on(t.shopId, t.updatedAt, t.id),
    index('customers_phone_idx').on(t.shopId, t.phone),
    index('customers_book_no_idx')
      .on(t.shopId, t.bookNo)
      .where(sql`${t.bookNo} is not null and ${t.deletedAt} is null`),
    index('customers_name_idx')
      .on(t.shopId, t.name)
      .where(sql`${t.deletedAt} is null`),
  ],
);

// 2.7 measurements — current set per customer per cloth (values in inches)
export const measurements = sqliteTable(
  'measurements',
  {
    id: text('id').primaryKey(),
    shopId: text('shop_id').notNull(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    garmentTypeId: text('garment_type_id')
      .notNull()
      .references(() => garmentTypes.id),
    notes: text('notes'),
    measuredOn: text('measured_on').notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('measurements_current_key')
      .on(t.customerId, t.garmentTypeId)
      .where(sql`${t.deletedAt} is null`),
    index('measurements_sync_idx').on(t.shopId, t.updatedAt, t.id),
  ],
);

// 2.8 measurement_values
export const measurementValues = sqliteTable(
  'measurement_values',
  {
    measurementId: text('measurement_id')
      .notNull()
      .references(() => measurements.id, { onDelete: 'cascade' }),
    fieldId: text('field_id')
      .notNull()
      .references(() => measurementFields.id, { onDelete: 'cascade' }),
    shopId: text('shop_id').notNull(),
    valueIn: real('value_in').notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    primaryKey({ columns: [t.measurementId, t.fieldId] }),
    check('measurement_values_range', sql`${t.valueIn} > 0 and ${t.valueIn} <= 999.99`),
    index('measurement_values_sync_idx').on(t.shopId, t.updatedAt, t.measurementId, t.fieldId),
  ],
);

// 2.9 measurement_versions — history (append-only)
export const measurementVersions = sqliteTable(
  'measurement_versions',
  {
    id: text('id').primaryKey(),
    shopId: text('shop_id').notNull(),
    measurementId: text('measurement_id')
      .notNull()
      .references(() => measurements.id, { onDelete: 'cascade' }),
    values: text('values', { mode: 'json' }).$type<Record<string, number>>().notNull(),
    notes: text('notes'),
    measuredOn: text('measured_on').notNull(),
    ...timestamps,
  },
  (t) => [
    index('measurement_versions_measurement_idx').on(t.measurementId, t.createdAt),
    index('measurement_versions_sync_idx').on(t.shopId, t.updatedAt, t.id),
  ],
);

// 2.10 orders
export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    shopId: text('shop_id').notNull(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    orderNo: integer('order_no').notNull(),
    status: text('status', { enum: ORDER_STATUSES }).notNull().default('received'),
    orderDate: text('order_date').notNull(),
    dueDate: text('due_date').notNull(),
    isUrgent: integer('is_urgent', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
    discount: integer('discount').notNull().default(0),
    gstRate: integer('gst_rate').notNull().default(0),
    readyOn: text('ready_on'),
    deliveredOn: text('delivered_on'),
    cancelledAt: text('cancelled_at'),
    cancelReason: text('cancel_reason'),
    createdVia: text('created_via', { enum: ['app', 'ai'] })
      .notNull()
      .default('app'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check('orders_status_check', inList('status', ORDER_STATUSES)),
    check('orders_due_after_order', sql`${t.dueDate} >= ${t.orderDate}`),
    check(
      'orders_delivered_on_matches_status',
      sql`(${t.status} = 'delivered') = (${t.deliveredOn} is not null)`,
    ),
    // Not unique on the device: an offline order keeps a provisional number until sync
    // renumbers a clash (ARCHITECTURE.md §3.5).
    index('orders_shop_order_no_idx').on(t.shopId, t.orderNo),
    index('orders_sync_idx').on(t.shopId, t.updatedAt, t.id),
    index('orders_active_idx')
      .on(t.shopId, t.status, t.dueDate)
      .where(sql`${t.deletedAt} is null and ${t.cancelledAt} is null`),
    index('orders_customer_idx')
      .on(t.customerId, t.orderDate)
      .where(sql`${t.deletedAt} is null`),
  ],
);

// 2.11 order_items
export const orderItems = sqliteTable(
  'order_items',
  {
    id: text('id').primaryKey(),
    shopId: text('shop_id').notNull(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    garmentTypeId: text('garment_type_id')
      .notNull()
      .references(() => garmentTypes.id),
    qty: integer('qty').notNull(),
    rate: integer('rate').notNull(),
    styles: text('styles', { mode: 'json' })
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'`),
    note: text('note'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check('order_items_qty', sql`${t.qty} between 1 and 50`),
    check('order_items_rate', sql`${t.rate} between 0 and 200000`),
    index('order_items_order_idx').on(t.orderId),
    index('order_items_sync_idx').on(t.shopId, t.updatedAt, t.id),
  ],
);

// 2.12 order_extras
export const orderExtras = sqliteTable(
  'order_extras',
  {
    id: text('id').primaryKey(),
    shopId: text('shop_id').notNull(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    amount: integer('amount').notNull(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check('order_extras_amount', sql`${t.amount} between 1 and 200000`),
    index('order_extras_order_idx').on(t.orderId),
    index('order_extras_sync_idx').on(t.shopId, t.updatedAt, t.id),
  ],
);

// 2.13 payments (negative amount = refund)
export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    shopId: text('shop_id').notNull(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    mode: text('mode', { enum: PAYMENT_MODES }).notNull().default('cash'),
    paidOn: text('paid_on').notNull(),
    note: text('note'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    check('payments_amount', sql`${t.amount} <> 0 and abs(${t.amount}) <= 1000000`),
    check('payments_mode_check', inList('mode', PAYMENT_MODES)),
    index('payments_order_idx').on(t.orderId),
    index('payments_paid_on_idx').on(t.shopId, t.paidOn),
    index('payments_sync_idx').on(t.shopId, t.updatedAt, t.id),
  ],
);

// 3.9 Device-only tables (never synced, no server counterpart).
export const outbox = sqliteTable(
  'outbox',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    tableName: text('table_name').notNull(),
    rowId: text('row_id').notNull(),
    op: text('op', { enum: ['upsert'] }).notNull(),
    payload: text('payload').notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    ...timestamps,
  },
  (t) => [
    check('outbox_op_check', sql`${t.op} in ('upsert')`),
    index('outbox_created_idx').on(t.createdAt),
  ],
);

export const syncCursors = sqliteTable('sync_cursors', {
  tableName: text('table_name').primaryKey(),
  cursorUpdatedAt: text('cursor_updated_at').notNull(),
  cursorId: text('cursor_id').notNull(),
  ...timestamps,
});
