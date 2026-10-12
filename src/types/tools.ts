export type ToolCategory =
  | 'Apps'
  | 'Communications'
  | 'Media'
  | 'Camera'
  | 'Web'
  | 'Device'
  | 'File'
  | 'Reminders'
  | 'Productivity'
  | 'Social'
  | 'Security'
  | 'Automation'
  | 'Accessibility'
  | 'Shopping'
  | 'Entertainment'
  | 'Health'
  | 'News & Weather'
  | 'Education'
  | 'Office'
  | 'Toolkit'
  | 'Advanced AI'
  | 'Reserved';

export type AvailabilityStatus =
  | 'available'
  | 'requires_android_bridge'
  | 'requires_permission'
  | 'unsupported_environment'
  | 'reserved_slot';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
}

export interface ToolExecutionResult {
  success: boolean;
  action: string;
  toolId: string;
  message: string;
  data?: Record<string, any>;
  requiresBridge?: boolean;
  error?: string;
  permissionRequested?: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  requiredPermissions: string[];
  inputParameters: ToolParameter[];
  executionFunction: (args: Record<string, any>, context?: any) => Promise<ToolExecutionResult>;
  successResponse: string;
  errorResponse: string;
  availabilityStatus: AvailabilityStatus;
}
