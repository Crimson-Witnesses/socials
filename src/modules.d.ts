declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
declare module "*.svg" {
  export default `` as string;
}
// remark-captions ships no type declarations.
declare module "remark-captions";
