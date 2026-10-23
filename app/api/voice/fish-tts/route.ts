import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { apiKey, baseUrl, text, reference_id, latency } = body;

        if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 401 });

        const targetUrl = `${(baseUrl || "https://api.fish.audio/v1").replace(/\/$/, "")}/tts`;
        
        const payload: Record<string, any> = {
            text,
            reference_id: reference_id || undefined,
            format: "mp3",
            mp3_bitrate: 128,
        };
        if (latency) payload.latency = latency;

        const response = await fetch(targetUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => "");
            return NextResponse.json({ error: `Fish Audio 报错: ${response.status} ${errText}` }, { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-store",
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "请求异常" }, { status: 500 });
    }
}