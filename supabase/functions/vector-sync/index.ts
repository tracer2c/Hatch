import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, documents } = await req.json();

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    switch (action) {
      case 'create_vector_store':
        // Create a new vector store for hatchery knowledge
        const createResponse = await fetch('https://api.openai.com/v1/vector_stores', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            name: 'Hatchery Knowledge Base',
            expires_after: {
              anchor: 'last_active_at',
              days: 365
            }
          }),
        });

        const vectorStore = await createResponse.json();
        console.log('Created vector store:', vectorStore);

        return new Response(JSON.stringify({
          vector_store_id: vectorStore.id,
          status: 'created'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'upload_documents':
        if (!documents || !Array.isArray(documents)) {
          throw new Error('Documents array is required');
        }

        const uploadResults = [];

        for (const doc of documents) {
          // Create file from document content
          const fileResponse = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'OpenAI-Beta': 'assistants=v2',
            },
            body: (() => {
              const formData = new FormData();
              const blob = new Blob([doc.content], { type: 'text/plain' });
              formData.append('file', blob, doc.filename || 'document.txt');
              formData.append('purpose', 'assistants');
              return formData;
            })(),
          });

          const fileResult = await fileResponse.json();
          uploadResults.push({
            filename: doc.filename,
            file_id: fileResult.id,
            status: fileResult.id ? 'uploaded' : 'failed'
          });
        }

        return new Response(JSON.stringify({
          results: uploadResults,
          status: 'uploaded'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'add_files_to_store':
        const { vector_store_id, file_ids } = await req.json();
        
        if (!vector_store_id || !file_ids) {
          throw new Error('Vector store ID and file IDs are required');
        }

        // Add files to vector store
        const addResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vector_store_id}/file_batches`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            file_ids: file_ids
          }),
        });

        const batchResult = await addResponse.json();

        return new Response(JSON.stringify({
          batch_id: batchResult.id,
          status: batchResult.status,
          file_counts: batchResult.file_counts
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'search_knowledge':
        const { query, vector_store_id: searchStoreId } = await req.json();
        
        if (!query || !searchStoreId) {
          throw new Error('Query and vector store ID are required');
        }

        // Create a temporary assistant to search the vector store
        const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            model: 'gpt-5-2025-08-07',
            name: 'Hatchery Knowledge Search',
            instructions: 'You are a helpful assistant that searches hatchery knowledge base.',
            tools: [{ type: 'file_search' }],
            tool_resources: {
              file_search: {
                vector_store_ids: [searchStoreId]
              }
            }
          }),
        });

        const assistant = await assistantResponse.json();

        // Create thread and run search
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: query
            }]
          }),
        });

        const thread = await threadResponse.json();

        // Run the assistant
        const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2',
          },
          body: JSON.stringify({
            assistant_id: assistant.id
          }),
        });

        const run = await runResponse.json();

        return new Response(JSON.stringify({
          thread_id: thread.id,
          run_id: run.id,
          assistant_id: assistant.id,
          status: 'searching'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Vector sync error:', error);
    return new Response(JSON.stringify({
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});