// A logo é branca: use sempre sobre o fundo terra (--terra-fundo).
export function Logo({ altura = 22, className }: { altura?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/marktiva-logo.png"
      alt="Marktiva"
      width={Math.round((672 / 138) * altura)}
      height={altura}
      className={className}
      style={{ display: "block", height: altura, width: "auto" }}
    />
  );
}
