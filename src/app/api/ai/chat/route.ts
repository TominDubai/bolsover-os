import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import type { ChatRequest, ChatResponse, ChatErrorResponse } from '@/lib/ai/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' } satisfies ChatErrorResponse,
      { status: 401 }
    )
  }

  // Parse and validate request body
  let body: ChatRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' } satisfies ChatErrorResponse,
      { status: 400 }
    )
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: 'Messages array is required and must not be empty' } satisfies ChatErrorResponse,
      { status: 400 }
    )
  }

  // Validate each message has role and content
  for (const msg of body.messages) {
    if (!msg.role || !msg.content || !['user', 'assistant'].includes(msg.role)) {
      return NextResponse.json(
        { error: 'Each message must have a valid role ("user" or "assistant") and content' } satisfies ChatErrorResponse,
        { status: 400 }
      )
    }
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: body.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    const textContent = response.content.find((block) => block.type === 'text')
    const message = textContent && 'text' in textContent ? textContent.text : ''

    const result: ChatResponse = {
      message,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_creation_input_tokens: (response.usage as unknown as Record<string, number>).cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: (response.usage as unknown as Record<string, number>).cache_read_input_tokens ?? 0,
      },
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Anthropic API error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response'
    return NextResponse.json(
      { error: errorMessage } satisfies ChatErrorResponse,
      { status: 500 }
    )
  }
}
