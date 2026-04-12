declare module 'yargs' {
  const yargs: any;
  export type Argv<T = any> = any;
  export default yargs;
}

declare module 'yargs/helpers' {
  export function hideBin(argv: string[]): string[];
}
