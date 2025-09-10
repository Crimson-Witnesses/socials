declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
declare module "*.svg" {
  export default `` as string;
}
