declare module "*.svg" {
  const component: import("react").FC<
    import("react").SVGProps<SVGSVGElement>
  >;
  export default component;
}
