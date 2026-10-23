import { NextRequest, NextResponse } from "next/server";

// Fish Audio TTS 服务端代理
// 目的：浏览器直连 https://api.fish.audio 会被 CORS 拦截，
// 因此改由服务端转发请求，拿到音频二进制后返回给前端。

export const runtime = "edge";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null) as Record<string, unknown> | null;
        if (!body) {
            return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
        }

        const apiKey = String(body.apiKey || "").trim();
        const text = String(body.text || "").trim();
        const baseUrl = String(body.baseUrl || "https://api.fish.audio/v1").replace(/\/+$/, "");
        const referenceId = body.reference_id ? String(body.reference_id).trim() : "";
        const latency = body.latency ? String(body.latency).trim() : "";

        if (!apiKey) {
            return NextResponse.json({ error: "Fish Audio API Key 未配置" }, { status: 401 });
        }
        if (!text) {
            return NextResponse.json({ error: "待合成文本为空" }, { status: 400 });
        }

        const payload: Record<string, unknown> = {
            text,
            format: "mp3",
            mp3_bitrate: 128,
        };
        if (referenceId) payload.reference_id = referenceId;
        if (latency) payload.latency = latency;

        let upstream: Response;
        try {
            upstream = await fetch(`${baseUrl}/tts`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            return NextResponse.json({ error: `网络请求失败: ${msg}` }, { status: 503 });
        }

        if (!upstream.ok) {
            const errText = await upstream.text().catch(() => "");
            return NextResponse.json(
                { error: `Fish Audio 请求失败 (${upstream.status}): ${errText.slice(0, 500)}` },
                { status: upstream.status },
            );
        }

        const buffer = await upstream.arrayBuffer();
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-store",
            },
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: msg || "代理请求异常" }, { status: 500 });
    }
}