interface Version {
  date: Date;
}

export const STORAGE_VERSIONS: { [version: number]: Version } = {
  0: { date: new Date("2020-06-22") },
  1: { date: new Date("2020-07-29") },
  2: { date: new Date("2020-08-26") },
  3: { date: new Date("2020-10-21") },
  4: { date: new Date("2020-12-10") },
  5: { date: new Date("2021-01-12") },
  6: { date: new Date('2021-01-15') },
};
