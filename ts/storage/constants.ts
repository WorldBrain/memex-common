/**
 * NOTE: These regexps contain the same base pattern.
 *      Please update these together if they change.
 * TODO: Can we share the base pattern somehow? `RegExp` constructor?
 */
export const HASH_TAG_PATTERN = /^-?#\"\w+([-. ]\w+)*\"$|^-?#\w+([-. ]\w+)*$/
export const VALID_TAG_PATTERN = /^\w+([-. ]\w+)*$/
