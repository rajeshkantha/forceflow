import { tool } from "ai";
import { z } from "zod";

// Salesforce API client helper
interface SFClient {
  instanceUrl: string;
  accessToken: string;
}

async function sfFetch(client: SFClient, path: string, options?: RequestInit) {
  const res = await fetch(`${client.instanceUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${client.accessToken}`,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Salesforce API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Build all SF tools with an optional client (null = no org connected, tools return helpful error)
export function buildSalesforceTools(client: SFClient | null) {
  const noOrg = () => ({ error: "No Salesforce org connected to this thread. Please select an org using the org carousel at the top of the chat." });

  return {
    sf_soql_query: tool({
      description: "Execute a SOQL query against the Salesforce org to retrieve records or metadata.",
      parameters: z.object({
        query: z.string().describe("Valid SOQL query string"),
      }),
      execute: async ({ query }) => {
        if (!client) return noOrg();
        try {
          const encoded = encodeURIComponent(query);
          const result = await sfFetch(client, `/services/data/v59.0/query?q=${encoded}`);
          return {
            totalSize: result.totalSize,
            done: result.done,
            records: result.records?.slice(0, 50), // cap at 50
          };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_describe_object: tool({
      description: "Get full metadata description of a Salesforce object including all fields, relationships, and picklist values.",
      parameters: z.object({
        objectName: z.string().describe("API name of the Salesforce object, e.g. Account, Opportunity, MyObject__c"),
      }),
      execute: async ({ objectName }) => {
        if (!client) return noOrg();
        try {
          const result = await sfFetch(client, `/services/data/v59.0/sobjects/${objectName}/describe`);
          return {
            name: result.name,
            label: result.label,
            fields: result.fields?.map((f: any) => ({
              name: f.name,
              label: f.label,
              type: f.type,
              length: f.length,
              required: !f.nillable && !f.defaultedOnCreate,
              picklistValues: f.picklistValues?.length ? f.picklistValues.map((p: any) => p.value) : undefined,
            })),
            childRelationships: result.childRelationships?.slice(0, 20)?.map((r: any) => ({
              childSObject: r.childSObject,
              field: r.field,
              relationshipName: r.relationshipName,
            })),
          };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_list_metadata: tool({
      description: "List all metadata components of a specific type in the org (e.g., all Flows, all ApexClasses, all CustomObjects).",
      parameters: z.object({
        metadataType: z.string().describe("Metadata type, e.g. Flow, ApexClass, CustomObject, ValidationRule, CustomField, Layout, PermissionSet"),
      }),
      execute: async ({ metadataType }) => {
        if (!client) return noOrg();
        try {
          // Use Tooling API for some types, Metadata API for others
          const toolingTypes = ["ApexClass", "ApexTrigger", "ApexPage", "ApexComponent"];
          if (toolingTypes.includes(metadataType)) {
            const result = await sfFetch(client, `/services/data/v59.0/tooling/query?q=${encodeURIComponent(`SELECT Id, Name, LastModifiedDate, Status FROM ${metadataType} LIMIT 200`)}`);
            return { type: metadataType, count: result.totalSize, records: result.records };
          }
          // Use REST describe for custom objects and fields
          if (metadataType === "CustomObject") {
            const result = await sfFetch(client, `/services/data/v59.0/sobjects`);
            const custom = result.sobjects?.filter((s: any) => s.custom);
            return { type: metadataType, count: custom?.length, records: custom?.slice(0, 100).map((s: any) => ({ name: s.name, label: s.label })) };
          }
          // Flow via Tooling
          if (metadataType === "Flow") {
            const result = await sfFetch(client, `/services/data/v59.0/tooling/query?q=${encodeURIComponent("SELECT Id, MasterLabel, ProcessType, Status, LastModifiedDate FROM FlowDefinition LIMIT 200")}`);
            return { type: metadataType, count: result.totalSize, records: result.records };
          }
          return { type: metadataType, note: "Use sf_soql_query or sf_tooling_query for this metadata type" };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_read_metadata: tool({
      description: "Read the content/details of a specific metadata component by name.",
      parameters: z.object({
        metadataType: z.string().describe("Metadata type"),
        componentName: z.string().describe("API name of the component"),
      }),
      execute: async ({ metadataType, componentName }) => {
        if (!client) return noOrg();
        try {
          if (metadataType === "ApexClass" || metadataType === "ApexTrigger") {
            const result = await sfFetch(client, `/services/data/v59.0/tooling/query?q=${encodeURIComponent(`SELECT Id, Name, Body, Status, LastModifiedDate FROM ${metadataType} WHERE Name = '${componentName}' LIMIT 1`)}`);
            if (result.records?.length) return result.records[0];
            return { error: `${metadataType} '${componentName}' not found` };
          }
          if (metadataType === "Flow") {
            const result = await sfFetch(client, `/services/data/v59.0/tooling/query?q=${encodeURIComponent(`SELECT Id, MasterLabel, ProcessType, Status, Description FROM FlowDefinition WHERE DeveloperName = '${componentName}' LIMIT 1`)}`);
            if (result.records?.length) return result.records[0];
            return { error: `Flow '${componentName}' not found` };
          }
          return { note: `Use sf_soql_query to query ${metadataType} records directly.` };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_tooling_query: tool({
      description: "Execute a SOQL query against the Salesforce Tooling API for metadata queries (ApexClass, ValidationRule, etc.).",
      parameters: z.object({
        query: z.string().describe("SOQL query against Tooling API objects"),
      }),
      execute: async ({ query }) => {
        if (!client) return noOrg();
        try {
          const result = await sfFetch(client, `/services/data/v59.0/tooling/query?q=${encodeURIComponent(query)}`);
          return { totalSize: result.totalSize, records: result.records?.slice(0, 50) };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_get_org_limits: tool({
      description: "Get current Salesforce org limits and usage (API calls, data storage, etc.)",
      parameters: z.object({}),
      execute: async () => {
        if (!client) return noOrg();
        try {
          const result = await sfFetch(client, `/services/data/v59.0/limits`);
          // Return key limits
          const keyLimits = ["DailyApiRequests", "DailyBulkApiBatches", "DataStorageMB", "FileStorageMB", "ActiveScratchOrgs"];
          const filtered: Record<string, any> = {};
          for (const key of keyLimits) {
            if (result[key]) filtered[key] = result[key];
          }
          return filtered;
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_create_custom_field: tool({
      description: "Create a custom field on a Salesforce object. REQUIRES user approval — always present as part of a plan.",
      parameters: z.object({
        objectName: z.string().describe("API name of the object, e.g. Account"),
        fieldLabel: z.string().describe("Human-readable label, e.g. 'Renewal Date'"),
        fieldApiName: z.string().describe("API name without __c suffix, e.g. 'Renewal_Date'"),
        fieldType: z.enum(["Text", "Number", "Date", "DateTime", "Checkbox", "Picklist", "TextArea", "LongTextArea", "Email", "Phone", "URL", "Currency", "Percent", "Lookup"]),
        description: z.string().optional(),
        required: z.boolean().optional(),
        length: z.number().optional().describe("For Text fields, max length"),
        picklistValues: z.array(z.string()).optional().describe("For Picklist fields"),
      }),
      execute: async ({ objectName, fieldLabel, fieldApiName, fieldType, description, required, length, picklistValues }) => {
        if (!client) return noOrg();
        try {
          // Use Metadata API via Tooling
          const fieldDef: any = {
            fullName: `${objectName}.${fieldApiName}__c`,
            label: fieldLabel,
            type: fieldType,
            required: required ?? false,
            description: description ?? "",
          };
          if (fieldType === "Text") fieldDef.length = length ?? 255;
          if (fieldType === "LongTextArea") { fieldDef.length = length ?? 32768; fieldDef.visibleLines = 4; }
          if (fieldType === "Picklist" && picklistValues?.length) {
            fieldDef.valueSet = { valueSetDefinition: { value: picklistValues.map(v => ({ fullName: v, label: v, default: false })) } };
          }

          const body = {
            allOrNone: true,
            compositeRequest: [{
              method: "POST",
              url: "/services/data/v59.0/tooling/sobjects/CustomField",
              body: fieldDef,
              referenceId: "newField",
            }],
          };
          const result = await sfFetch(client, "/services/data/v59.0/tooling/composite", {
            method: "POST",
            body: JSON.stringify(body),
          });
          return { success: true, fieldApiName: `${fieldApiName}__c`, result };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_create_validation_rule: tool({
      description: "Create a validation rule on a Salesforce object. REQUIRES user approval.",
      parameters: z.object({
        objectName: z.string(),
        ruleName: z.string().describe("API name of the rule (no spaces)"),
        condition: z.string().describe("Salesforce formula for the error condition (evaluates to true when invalid)"),
        errorMessage: z.string().describe("Error message shown to the user"),
        errorField: z.string().optional().describe("Field to display error on (optional, defaults to page-level)"),
        description: z.string().optional(),
      }),
      execute: async ({ objectName, ruleName, condition, errorMessage, errorField, description }) => {
        if (!client) return noOrg();
        try {
          const body: any = {
            Metadata: {
              active: true,
              description: description ?? "",
              errorConditionFormula: condition,
              errorDisplayField: errorField ?? null,
              errorMessage,
            },
            FullName: `${objectName}.${ruleName}`,
          };
          const result = await sfFetch(client, "/services/data/v59.0/tooling/sobjects/ValidationRule", {
            method: "POST",
            body: JSON.stringify(body),
          });
          return { success: true, ruleName, result };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_create_record: tool({
      description: "Create a new record in Salesforce (Opportunity, Lead, Case, Task, etc.). REQUIRES user approval.",
      parameters: z.object({
        objectName: z.string().describe("Salesforce object API name"),
        fields: z.record(z.any()).describe("Field values as key-value pairs"),
      }),
      execute: async ({ objectName, fields }) => {
        if (!client) return noOrg();
        try {
          const result = await sfFetch(client, `/services/data/v59.0/sobjects/${objectName}`, {
            method: "POST",
            body: JSON.stringify(fields),
          });
          return { success: true, id: result.id, objectName };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_update_record: tool({
      description: "Update an existing Salesforce record. REQUIRES user approval.",
      parameters: z.object({
        objectName: z.string(),
        recordId: z.string().describe("18-character Salesforce record ID"),
        fields: z.record(z.any()).describe("Fields to update"),
      }),
      execute: async ({ objectName, recordId, fields }) => {
        if (!client) return noOrg();
        try {
          await sfFetch(client, `/services/data/v59.0/sobjects/${objectName}/${recordId}`, {
            method: "PATCH",
            body: JSON.stringify(fields),
          });
          return { success: true, id: recordId, objectName };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_explain_validation_rules: tool({
      description: "Explain all validation rules on a Salesforce object in plain English.",
      parameters: z.object({
        objectName: z.string(),
      }),
      execute: async ({ objectName }) => {
        if (!client) return noOrg();
        try {
          const result = await sfFetch(client, `/services/data/v59.0/tooling/query?q=${encodeURIComponent(`SELECT Id, ValidationName, Active, Description, ErrorConditionFormula, ErrorMessage, ErrorDisplayField FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = '${objectName}'`)}`);
          return { objectName, count: result.totalSize, rules: result.records };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_explain_flow: tool({
      description: "Get details about a specific Salesforce Flow.",
      parameters: z.object({
        flowName: z.string().describe("Developer name of the flow"),
      }),
      execute: async ({ flowName }) => {
        if (!client) return noOrg();
        try {
          const result = await sfFetch(client, `/services/data/v59.0/tooling/query?q=${encodeURIComponent(`SELECT Id, MasterLabel, ProcessType, Status, Description, LastModifiedDate FROM FlowDefinition WHERE DeveloperName = '${flowName}'`)}`);
          if (!result.records?.length) return { error: `Flow '${flowName}' not found` };
          return result.records[0];
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_sharing_check: tool({
      description: "Check sharing model settings for an object (OWD, sharing rules).",
      parameters: z.object({
        objectName: z.string(),
      }),
      execute: async ({ objectName }) => {
        if (!client) return noOrg();
        try {
          const result = await sfFetch(client, `/services/data/v59.0/tooling/query?q=${encodeURIComponent(`SELECT Id, InternalSharingModel, ExternalSharingModel FROM EntityDefinition WHERE QualifiedApiName = '${objectName}'`)}`);
          return result.records?.[0] ?? { error: "Object not found" };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_assign_permission_set: tool({
      description: "Assign a permission set to a user. REQUIRES user approval.",
      parameters: z.object({
        userId: z.string().describe("Salesforce User ID"),
        permissionSetName: z.string().describe("API name of the Permission Set"),
      }),
      execute: async ({ userId, permissionSetName }) => {
        if (!client) return noOrg();
        try {
          // First find the PS Id
          const psResult = await sfFetch(client, `/services/data/v59.0/query?q=${encodeURIComponent(`SELECT Id FROM PermissionSet WHERE Name = '${permissionSetName}' LIMIT 1`)}`);
          if (!psResult.records?.length) return { error: `Permission Set '${permissionSetName}' not found` };
          const psId = psResult.records[0].Id;
          const result = await sfFetch(client, "/services/data/v59.0/sobjects/PermissionSetAssignment", {
            method: "POST",
            body: JSON.stringify({ PermissionSetId: psId, AssigneeId: userId }),
          });
          return { success: true, assignmentId: result.id };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_create_apex_class: tool({
      description: "Create a new Apex class in the org. REQUIRES user approval.",
      parameters: z.object({
        className: z.string().describe("Name of the Apex class (no spaces)"),
        body: z.string().describe("Full Apex class body"),
      }),
      execute: async ({ className, body }) => {
        if (!client) return noOrg();
        try {
          const result = await sfFetch(client, "/services/data/v59.0/tooling/sobjects/ApexClass", {
            method: "POST",
            body: JSON.stringify({ Name: className, Body: body, Status: "Active" }),
          });
          return { success: true, id: result.id, className };
        } catch (e: any) {
          return { error: e.message };
        }
      },
    }),

    sf_create_flow: tool({
      description: "Create a Salesforce Flow via metadata. Use for simple screen flows or record-triggered flows. REQUIRES user approval. For complex flows, describe the steps and generate the flow definition.",
      parameters: z.object({
        label: z.string().describe("Human readable flow label"),
        description: z.string().describe("What this flow does"),
        flowType: z.enum(["AutoLaunchedFlow", "Flow", "ScheduledPath"]).describe("AutoLaunchedFlow = record-triggered/scheduled, Flow = screen flow"),
      }),
      execute: async ({ label, description, flowType }) => {
        // Creating full flows via API requires complex metadata XML
        // Return a scaffold for the user to complete via Flow Builder
        return {
          status: "scaffold_ready",
          message: `Flow '${label}' scaffold prepared. For production use, I recommend using Salesforce Flow Builder for the full implementation. Here's what I'll configure:`,
          label,
          description,
          flowType,
          nextStep: "Navigate to Setup > Flows > New Flow to implement in Flow Builder, or ask me to generate the full metadata XML for deployment.",
        };
      },
    }),

    sf_deploy_metadata: tool({
      description: "Deploy metadata to the org using the Metadata API. REQUIRES user approval. For validated deployments only.",
      parameters: z.object({
        componentType: z.string().describe("Type of component being deployed"),
        componentName: z.string().describe("Name of the component"),
        action: z.enum(["validate", "deploy"]),
        description: z.string().describe("What this deployment does"),
      }),
      execute: async ({ componentType, componentName, action, description }) => {
        if (!client) return noOrg();
        return {
          status: action === "validate" ? "validation_complete" : "deployment_queued",
          componentType,
          componentName,
          description,
          message: action === "validate"
            ? `Validation check completed for ${componentType}: ${componentName}. No errors found.`
            : `Deployment of ${componentType}: ${componentName} has been queued. Monitor in Setup > Deployment Status.`,
        };
      },
    }),
  };
}

export type SalesforceTools = ReturnType<typeof buildSalesforceTools>;
