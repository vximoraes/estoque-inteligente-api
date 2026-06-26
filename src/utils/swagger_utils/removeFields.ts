export default function removeFieldsRecursively(
  obj: unknown,
  fieldsToRemove: string[],
): void {
  if (Array.isArray(obj)) {
    obj.forEach((item) => removeFieldsRecursively(item, fieldsToRemove));
  } else if (obj && typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    Object.keys(record).forEach((key) => {
      if (fieldsToRemove.includes(key)) {
        delete record[key];
      } else {
        removeFieldsRecursively(record[key], fieldsToRemove);
      }
    });
  }
}
