import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        console.log('🎙️ Transcribing audio file:', audioFile.name, 'Size:', audioFile.size);

        // Convert File to the format OpenAI expects
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'es', // Spanish
            response_format: 'text',
        });

        console.log('✅ Transcription result:', transcription);

        return NextResponse.json({
            success: true,
            text: transcription
        });

    } catch (error: any) {
        console.error('❌ Transcription error:', error);

        // Handle quota errors specifically
        if (error.status === 429 || error.message?.includes('quota')) {
            return NextResponse.json(
                { error: 'Sin créditos de OpenAI. Por favor recarga tu cuenta en platform.openai.com' },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Transcription failed' },
            { status: 500 }
        );
    }
}
