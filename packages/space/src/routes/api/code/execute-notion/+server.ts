import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ExecuteRequest {
  code: string;
  lesson_id: number;
  paper_id: string;
}

interface ExecuteResponse {
  success: boolean;
  output: string[];
  error?: string;
  executionTime?: number;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { code, lesson_id, paper_id }: ExecuteRequest = await request.json();

    if (!code || !paper_id) {
      return json({
        success: false,
        output: [],
        error: 'Missing required fields: code and paper_id'
      }, { status: 400 });
    }

    // Validate code structure for Notion API lessons
    const validation = validateNotionCode(code, lesson_id);
    if (!validation.valid) {
      return json({
        success: false,
        output: [],
        error: validation.error
      }, { status: 400 });
    }

    // Start performance measurement
    const startTime = performance.now();

    // Execute code simulation
    const result = await simulateNotionAPIExecution(code, lesson_id);

    // Calculate execution time
    const executionTime = performance.now() - startTime;

    return json({
      success: result.success,
      output: result.output,
      error: result.error,
      executionTime
    });
  } catch (error) {
    console.error('Code execution error:', error);
    return json({
      success: false,
      output: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

function validateNotionCode(code: string, lessonId: number): { valid: boolean; error?: string } {
  // Remove comments for validation
  const cleanCode = stripComments(code);

  // Basic security checks (still block dangerous patterns, but allow require for Notion)
  const dangerousPatterns = [
    { pattern: /eval\s*\(/, message: 'eval() is not allowed' },
    { pattern: /Function\s*\(/, message: 'Function constructor is not allowed' },
    { pattern: /child_process/, message: 'child_process is not allowed' },
    { pattern: /fs\s*=\s*require/, message: 'filesystem access is not allowed' },
    { pattern: /\bexec\s*\(/, message: 'exec() is not allowed' },
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(cleanCode)) {
      return { valid: false, error: message };
    }
  }

  // Validate lesson-specific requirements
  switch (lessonId) {
    case 1:
      // Lesson 1: Must use data_source_id instead of database_id
      if (cleanCode.includes('database_id') && !cleanCode.includes('data_source_id')) {
        return {
          valid: false,
          error: 'You need to replace database_id with data_source_id. Check the TODO comment!'
        };
      }
      if (!cleanCode.includes('data_source_id:')) {
        return {
          valid: false,
          error: 'You need to change the parameter name from database_id to data_source_id'
        };
      }
      break;

    case 2:
      // Lesson 2: All three database_id should be changed to data_source_id
      const databaseIdCount = (cleanCode.match(/database_id:/g) || []).length;
      const dataSourceIdCount = (cleanCode.match(/data_source_id:/g) || []).length;

      if (databaseIdCount > 0) {
        return {
          valid: false,
          error: `You still have ${databaseIdCount} database_id parameter(s). Replace all with data_source_id!`
        };
      }
      if (dataSourceIdCount < 3) {
        return {
          valid: false,
          error: 'You need to update all three queries to use data_source_id'
        };
      }
      break;

    case 3:
      // Lesson 3: Must use new parent format
      if (cleanCode.includes('database_id:') && cleanCode.includes('parent:')) {
        return {
          valid: false,
          error: 'The parent object needs to use data_source_id instead of database_id'
        };
      }
      if (!cleanCode.includes('type:') || !cleanCode.includes('data_source_id:')) {
        return {
          valid: false,
          error: 'Parent object must include both type and data_source_id fields'
        };
      }
      break;
  }

  return { valid: true };
}

async function simulateNotionAPIExecution(
  code: string,
  lessonId: number
): Promise<{ success: boolean; output: string[]; error?: string }> {
  const output: string[] = [];

  try {
    // Simulate execution based on lesson
    switch (lessonId) {
      case 1:
        // Lesson 1: Basic parameter migration
        output.push('Found 12 pages');
        break;

      case 2:
        // Lesson 2: Updating multiple queries
        output.push('Fetched 47 total items');
        break;

      case 3:
        // Lesson 3: Create page with data source
        output.push('Created task: Migrate Notion API');
        break;

      default:
        output.push('Code executed successfully');
    }

    return {
      success: true,
      output
    };
  } catch (error) {
    return {
      success: false,
      output: [],
      error: error instanceof Error ? error.message : 'Execution failed'
    };
  }
}

function stripComments(code: string): string {
  // Remove single-line comments (// ...)
  let cleaned = code.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments (/* ... */)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  return cleaned;
}
