export const isListEqual = (listA: string[], listB: string[]): boolean => {
  return listA.length === listB.length && listA.every(el => listB.includes(el));
};
