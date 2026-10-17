import Image from "next/image";

export default function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark${small ? " small-mark" : ""}`}>
      <Image src="/nec-naija-mark.png" alt="" width={48} height={48} priority />
    </span>
  );
}
