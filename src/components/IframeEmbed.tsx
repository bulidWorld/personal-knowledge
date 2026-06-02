interface IframeEmbedProps {
  src: string
}

export default function IframeEmbed({ src }: IframeEmbedProps) {
  return (
    <div className="relative w-full aspect-video my-3">
      <iframe
        src={src}
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
        title="Embedded content"
        className="absolute inset-0 w-full h-full rounded-lg border border-slate-200"
      />
    </div>
  )
}
