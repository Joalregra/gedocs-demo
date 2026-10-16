import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
).toString();

export default function PdfThumbnail({ url, alt, className }) {
    const canvasRef = useRef(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function render() {
            try {
                const pdf = await pdfjsLib.getDocument(url).promise;
                if (cancelled) return;

                const page = await pdf.getPage(1);
                if (cancelled) return;

                const canvas = canvasRef.current;
                if (!canvas) return;

                const container = canvas.parentElement;
                const targetWidth = container?.offsetWidth || 200;
                const unscaledViewport = page.getViewport({ scale: 1 });
                const scale = targetWidth / unscaledViewport.width;
                const viewport = page.getViewport({ scale });

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: canvas.getContext("2d"),
                    viewport,
                }).promise;
            } catch {
                if (!cancelled) setError(true);
            }
        }

        render();
        return () => { cancelled = true; };
    }, [url]);

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 text-gray-400 text-xs ${className}`}>
                PDF
            </div>
        );
    }

    return (
        <canvas
            ref={canvasRef}
            aria-label={alt}
            className={className}
        />
    );
}
