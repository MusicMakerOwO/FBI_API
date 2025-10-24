/**
 * Simplifies a type by resolving intersections and making it more readable.
 * This is especially useful for complex types resulting from intersections.
 * @example
 * ```ts
 * type ComplexType = { a: string } & { b: number } & { c: boolean };
 * type SimplifiedType = Prettify<ComplexType>;
 * // Resulting type: { a: string; b: number; c: boolean }
 * ```
 * One big caveat is that this only works properly with types that have
 * known keys. Types with index signatures (e.g., `{ [key: string]: any }`)
 * may not behave as expected.
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Extracts the union of all value types from an object type.
 * Great if you want to use a JS object as a map of constants.
 * @example
 * ```ts
 * const COLORS = {
 *   RED: 'red',
 *   BLUE: 'blue',
 *   GREEN: 'green'
 * } as const;
 *
 * type Color = ObjectValues<typeof COLORS>; // 'red' | 'blue' | 'green'
 * ```
 */
export type ObjectValues<T> = T[keyof T];