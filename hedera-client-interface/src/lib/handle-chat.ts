import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { ChatRequest } from '@/shared/types';

const chatResponseSchema = z.object({
  message: z.string(),
  transactionBytes: z.string().optional(),
});

export async function handleChatRequest(body: ChatRequest) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  // Check if response is OK
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }
  
  // Try to parse JSON
  let rawData;
  try {
    rawData = await response.json();
  } catch (error) {
    const textContent = await response.text();
    throw new Error(`Invalid JSON response from API: ${textContent.substring(0, 200)}`);
  }
  
  return chatResponseSchema.parse(rawData);
}

export function useHandleChat() {
  return useMutation({
    mutationKey: ['handle-ai-chat'],
    mutationFn: (data: ChatRequest) => handleChatRequest(data),
  });
}
