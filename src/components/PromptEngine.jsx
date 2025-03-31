import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Copy, Play, Plus, Settings, Edit, Tag, Bookmark, X, Clipboard } from 'lucide-react';

// Template prompt data
const templatePrompts = [
  {
    id: 'template-project',
    title: 'Project-Specific Help',
    description: 'Get help with your specific project configuration.',
    template: 'I need help with my {{project_type}} project. Here are the details of my project configuration:\n\n- Framework: {{framework}}\n- Tech Stack: {{tech_stack}}\n- Testing Tools: {{testing}}\n- Linter: {{linter}}\n- Formatter: {{formatter}}\n- Build Command: {{build_command}}\n- Dev Command: {{dev_command}}\n- Package Manager: {{package_manager}}\n- Node Version: {{node_version}}\n- Server Type: {{server_type}}\n- API Protocol: {{api_protocol}}\n- Database: {{database}}\n\n{{project_rules_section}}\n\nI need help with the following issue:\n\n{{issue_description}}\n\nPlease provide detailed guidance specific to my project configuration.',
    variables: [
      { name: 'project_type', description: 'Type of project', default: 'javascript' },
      { name: 'framework', description: 'Framework used', default: 'none' },
      { name: 'tech_stack', description: 'Technologies used', default: 'Not specified' },
      { name: 'testing', description: 'Testing framework', default: 'none' },
      { name: 'linter', description: 'Linter used', default: 'none' },
      { name: 'formatter', description: 'Code formatter', default: 'none' },
      { name: 'build_command', description: 'Build command', default: 'npm run build' },
      { name: 'dev_command', description: 'Development command', default: 'npm run dev' },
      { name: 'package_manager', description: 'Package manager', default: 'npm' },
      { name: 'node_version', description: 'Node.js version', default: '18.x' },
      { name: 'server_type', description: 'Server type', default: 'local' },
      { name: 'api_protocol', description: 'API protocol', default: 'rest' },
      { name: 'database', description: 'Database type', default: 'none' },
      { name: 'project_rules_section', description: 'Project rules', default: '' },
      { name: 'issue_description', description: 'Description of the issue', default: 'I need help implementing a new feature...' }
    ],
    tags: ['project', 'configuration', 'help']
  },
  {
    id: 'template-1',
    title: 'Code Review',
    description: 'Ask for a detailed code review with specific focus areas.',
    template: 'Please review the following code and provide feedback on the {{focus_area}}:\n\n```{{language}}\n{{code}}\n```\n\nPlease focus on {{aspect}} and suggest improvements.',
    variables: [
      { name: 'focus_area', description: 'Area to focus the review on', default: 'architecture and performance' },
      { name: 'language', description: 'Programming language', default: 'javascript' },
      { name: 'code', description: 'Code to review', default: '// Paste your code here' },
      { name: 'aspect', description: 'Specific aspect to improve', default: 'readability and maintainability' }
    ],
    tags: ['code review', 'improve', 'analysis']
  },
  {
    id: 'template-2',
    title: 'Feature Implementation',
    description: 'Ask for help implementing a specific feature.',
    template: 'I need to implement {{feature_name}} in my {{project_type}} project. The tech stack includes {{tech_stack}}.\n\nProject details:\n- Framework: {{framework}}\n- Testing: {{testing}}\n- Linter: {{linter}}\n- Build Command: {{build_command}}\n- Dev Command: {{dev_command}}\n\nHere are the requirements:\n\n{{requirements}}\n\nPlease provide a step-by-step guide and code examples to implement this feature that align with my project configuration.',
    variables: [
      { name: 'feature_name', description: 'Name of the feature', default: 'user authentication' },
      { name: 'project_type', description: 'Type of project', default: 'web application' },
      { name: 'tech_stack', description: 'Technologies used', default: 'React, Node.js, MongoDB' },
      { name: 'framework', description: 'Framework used', default: 'none' },
      { name: 'testing', description: 'Testing framework', default: 'none' },
      { name: 'linter', description: 'Linter used', default: 'none' },
      { name: 'build_command', description: 'Build command', default: 'npm run build' },
      { name: 'dev_command', description: 'Development command', default: 'npm run dev' },
      { name: 'requirements', description: 'Feature requirements', default: '- User login with email/password\n- Social login options\n- Password reset functionality' }
    ],
    tags: ['implementation', 'feature', 'guide']
  },
  {
    id: 'template-3',
    title: 'Bug Diagnosis',
    description: 'Get help diagnosing and fixing a bug.',
    template: 'I\'m experiencing a bug in my {{language}} application using {{framework}} framework. Here are the details:\n\n**Project Configuration**:\n- Tech Stack: {{tech_stack}}\n- Testing Framework: {{testing}}\n- Linter: {{linter}}\n\n**Expected behavior**: {{expected}}\n\n**Actual behavior**: {{actual}}\n\n**Error message**: {{error}}\n\n**Code snippet**:\n```{{language}}\n{{code}}\n```\n\nHow can I diagnose and fix this issue?',
    variables: [
      { name: 'language', description: 'Programming language', default: 'javascript' },
      { name: 'framework', description: 'Framework used', default: 'none' },
      { name: 'tech_stack', description: 'Technologies used', default: 'React, Node.js, MongoDB' },
      { name: 'testing', description: 'Testing framework', default: 'none' },
      { name: 'linter', description: 'Linter used', default: 'none' },
      { name: 'expected', description: 'Expected behavior', default: 'The function should return the filtered array' },
      { name: 'actual', description: 'Actual behavior', default: 'The function returns an empty array' },
      { name: 'error', description: 'Error message (if any)', default: 'TypeError: Cannot read property of undefined' },
      { name: 'code', description: 'Problematic code', default: '// Paste your code here' }
    ],
    tags: ['bug', 'fix', 'troubleshooting']
  },
  {
    id: 'template-4',
    title: 'Performance Optimization',
    description: 'Get advice on optimizing code performance.',
    template: 'I need to optimize the following {{language}} code for {{optimization_goal}} in my project using {{framework}} framework:\n\n**Project Configuration**:\n- Tech Stack: {{tech_stack}}\n- Testing Framework: {{testing}}\n- Linter: {{linter}}\n\n```{{language}}\n{{code}}\n```\n\nCurrent performance: {{current_performance}}\n\nTarget performance: {{target_performance}}\n\nPlease suggest optimization strategies and provide optimized code examples that align with my project configuration.',
    variables: [
      { name: 'language', description: 'Programming language', default: 'javascript' },
      { name: 'framework', description: 'Framework used', default: 'none' },
      { name: 'tech_stack', description: 'Technologies used', default: 'React, Node.js, MongoDB' },
      { name: 'testing', description: 'Testing framework', default: 'none' },
      { name: 'linter', description: 'Linter used', default: 'none' },
      { name: 'optimization_goal', description: 'Goal of optimization', default: 'better time complexity' },
      { name: 'code', description: 'Code to optimize', default: '// Paste your code here' },
      { name: 'current_performance', description: 'Current performance metrics', default: 'O(n²) time complexity, processing 1000 items takes 5 seconds' },
      { name: 'target_performance', description: 'Target performance', default: 'O(n log n) or better, processing 1000 items in under 1 second' }
    ],
    tags: ['performance', 'optimization', 'speed']
  },
  {
    id: 'template-5',
    title: 'Architecture Design',
    description: 'Get help designing a system architecture.',
    template: 'I\'m designing the architecture for a {{project_type}} with the following requirements:\n\n{{requirements}}\n\n**Project Configuration**:\n- Framework: {{framework}}\n- Tech Stack: {{tech_stack}}\n- Testing Framework: {{testing}}\n- Linter: {{linter}}\n- Build Command: {{build_command}}\n- Dev Command: {{dev_command}}\n- Package Manager: {{package_manager}}\n\nPlease suggest an appropriate architecture design, including component structure, data flow, and any design patterns that would be beneficial for my specific project configuration.',
    variables: [
      { name: 'project_type', description: 'Type of project', default: 'web application' },
      { name: 'framework', description: 'Framework used', default: 'none' },
      { name: 'tech_stack', description: 'Technologies to use', default: 'React, Node.js, PostgreSQL, Redis' },
      { name: 'testing', description: 'Testing framework', default: 'none' },
      { name: 'linter', description: 'Linter used', default: 'none' },
      { name: 'build_command', description: 'Build command', default: 'npm run build' },
      { name: 'dev_command', description: 'Development command', default: 'npm run dev' },
      { name: 'package_manager', description: 'Package manager', default: 'npm' },
      { name: 'requirements', description: 'Project requirements', default: '- High scalability (millions of users)\n- Real-time updates\n- Data persistence\n- Authentication and authorization' }
    ],
    tags: ['architecture', 'design', 'system']
  },
  {
    id: 'template-6',
    title: 'Documentation',
    description: 'Get help creating documentation for your code.',
    template: 'Please help me create documentation for the following {{language}} code in my project:\n\n**Project Configuration**:\n- Framework: {{framework}}\n- Tech Stack: {{tech_stack}}\n- Linter: {{linter}}\n\n```{{language}}\n{{code}}\n```\n\nThe documentation should include:\n- {{doc_type}}\n- {{inclusion}}\n\nTarget audience: {{audience}}\n\nPlease ensure the documentation style is consistent with the project\'s framework and conventions.',
    variables: [
      { name: 'language', description: 'Programming language', default: 'javascript' },
      { name: 'framework', description: 'Framework used', default: 'none' },
      { name: 'tech_stack', description: 'Technologies used', default: 'React, Node.js, MongoDB' },
      { name: 'linter', description: 'Linter used', default: 'none' },
      { name: 'code', description: 'Code to document', default: '// Paste your code here' },
      { name: 'doc_type', description: 'Type of documentation', default: 'Function descriptions, parameter details, and return values' },
      { name: 'inclusion', description: 'What to include', default: 'Usage examples and edge cases' },
      { name: 'audience', description: 'Documentation audience', default: 'Junior developers who will maintain this code' }
    ],
    tags: ['documentation', 'docs', 'comments']
  }
];

const PromptEngine = ({ selectedFiles = [], projectRules = '' }) => {
  // Log the selectedFiles prop for debugging
  console.log('PromptEngine received selectedFiles:', selectedFiles);
  
  const [activeTab, setActiveTab] = useState('user');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [userRequirement, setUserRequirement] = useState('');
  const [internalSelectedFiles, setInternalSelectedFiles] = useState(selectedFiles);
  const [promptOptions, setPromptOptions] = useState({
    includeProgrammingLanguage: false,
    includeFramework: false,
    includeTechStack: false,
    includeRules: false,
    includeProjectConfig: false,
    includeSelectedFiles: false,
    includeProjectPaths: false,
    _sections: {}
  });
  const [variables, setVariables] = useState({});
  const [finalPrompt, setFinalPrompt] = useState('');
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectConfig, setProjectConfig] = useState(null);
  
  const editorRef = useRef(null);
  
  // Initialize the component
  useEffect(() => {
    // Load any saved custom prompts from localStorage
    const savedCustomPrompts = localStorage.getItem('pastemax-custom-prompts');
    if (savedCustomPrompts) {
      try {
        setSavedPrompts(JSON.parse(savedCustomPrompts));
      } catch (e) {
        console.error('Error loading saved prompts:', e);
      }
    }
    
    // Load saved user prompt from localStorage
    const savedUserPrompt = localStorage.getItem('pastemax-user-prompt');
    if (savedUserPrompt) {
      try {
        setUserPrompt(savedUserPrompt);
      } catch (e) {
        console.error('Error loading user prompt:', e);
      }
    }
    
    // Load saved user requirement from localStorage
    const savedUserRequirement = localStorage.getItem('pastemax-user-requirement');
    if (savedUserRequirement) {
      try {
        setUserRequirement(savedUserRequirement);
      } catch (e) {
        console.error('Error loading user requirement:', e);
      }
    }
    
    // Load saved prompt options from localStorage
    const savedPromptOptions = localStorage.getItem('pastemax-prompt-options');
    if (savedPromptOptions) {
      try {
        setPromptOptions(JSON.parse(savedPromptOptions));
      } catch (e) {
        console.error('Error loading prompt options:', e);
      }
    }
    
    // Load project configuration from localStorage
    loadProjectConfig();
    
    // Add storage event listener to update when project config changes
    const handleStorageChange = (e) => {
      if (e.key === 'project-config') {
        loadProjectConfig();
      }
    };
    
    // Add custom event listener for direct updates
    const handleConfigUpdate = (e) => {
      console.log('Project config updated:', e.detail.config);
      setProjectConfig(e.detail.config);
      
      // If a template is selected, update the variables with the new config
      if (selectedTemplate) {
        updateTemplateWithNewConfig(e.detail.config);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('project-config-updated', handleConfigUpdate);
    
    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('project-config-updated', handleConfigUpdate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]);
  
  // Save user prompt to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('pastemax-user-prompt', userPrompt);
  }, [userPrompt]);
  
  // Save user requirement to localStorage and update prompt
  useEffect(() => {
    localStorage.setItem('pastemax-user-requirement', userRequirement);
    
    // Update the prompt when requirement changes
    if (promptOptions._sections) {
      updatePromptContent(promptOptions._sections);
    }
  }, [userRequirement]);
  
  // Save prompt options to localStorage when they change
  useEffect(() => {
    localStorage.setItem('pastemax-prompt-options', JSON.stringify(promptOptions));
  }, [promptOptions]);
  
  // Update internalSelectedFiles when selectedFiles prop changes
  useEffect(() => {
    console.log('Updating internalSelectedFiles from prop:', selectedFiles);
    setInternalSelectedFiles(selectedFiles);
  }, [selectedFiles]);
  
  // Log when selectedFiles changes
  useEffect(() => {
    console.log('selectedFiles prop changed:', selectedFiles);
  }, [selectedFiles]);
  
  // Initialize includeRules based on projectRules
  useEffect(() => {
    if (projectRules && projectRules.trim() !== '') {
      setPromptOptions(prevOptions => ({
        ...prevOptions,
        includeRules: true
      }));
    }
  }, [projectRules]);
  
  // Update variables with project info
  const updateVariablesWithProjectInfo = (variables, projectInfo) => {
    const updatedVariables = { ...variables };
    
    // Update all variables based on the project info
    if (Object.prototype.hasOwnProperty.call(variables, 'project_type') && projectInfo.projectType) {
      updatedVariables.project_type = projectInfo.projectType;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'language') && projectInfo.language) {
      updatedVariables.language = projectInfo.language;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'framework') && projectInfo.framework) {
      updatedVariables.framework = projectInfo.framework === 'none' ? 'None' : projectInfo.framework;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'tech_stack') && projectInfo.techStack) {
      updatedVariables.tech_stack = projectInfo.techStack;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'testing') && projectInfo.testing) {
      updatedVariables.testing = projectInfo.testing === 'none' ? 'None' : projectInfo.testing;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'linter') && projectInfo.linter) {
      updatedVariables.linter = projectInfo.linter === 'none' ? 'None' : projectInfo.linter;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'formatter') && projectInfo.formatter) {
      updatedVariables.formatter = projectInfo.formatter === 'none' ? 'None' : projectInfo.formatter;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'build_command') && projectInfo.buildCommand) {
      updatedVariables.build_command = projectInfo.buildCommand;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'dev_command') && projectInfo.devCommand) {
      updatedVariables.dev_command = projectInfo.devCommand;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'package_manager') && projectInfo.packageManager) {
      updatedVariables.package_manager = projectInfo.packageManager;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'node_version') && projectInfo.nodeVersion) {
      updatedVariables.node_version = projectInfo.nodeVersion;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'project_rules') && projectInfo.projectRules) {
      updatedVariables.project_rules = projectInfo.projectRules;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'database') && projectInfo.database) {
      updatedVariables.database = projectInfo.database === 'other' ? projectInfo.customDatabase : projectInfo.database;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'server_type') && projectInfo.serverType) {
      updatedVariables.server_type = projectInfo.serverType;
    }
    
    if (Object.prototype.hasOwnProperty.call(variables, 'api_protocol') && projectInfo.apiProtocol) {
      updatedVariables.api_protocol = projectInfo.apiProtocol;
    }
    
    return updatedVariables;
  };
  
  // Update template variables when project config changes
  useEffect(() => {
    if (projectConfig && selectedTemplate) {
      console.log('Project config changed in useEffect:', projectConfig);
      
      // Get project info
      const projectInfo = getProjectInfo();
      console.log('Project info in useEffect:', projectInfo);
      
      // Update variables with project info
      const updatedVariables = updateVariablesWithProjectInfo(variables, projectInfo);
      console.log('Updated variables in useEffect:', updatedVariables);
      
      // Update the variables state
      setVariables(updatedVariables);
      
      // Update the final prompt
      updateFinalPrompt(selectedTemplate.template, updatedVariables);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    projectConfig ? JSON.stringify(projectConfig) : null, 
    selectedTemplate ? selectedTemplate.id : null
  ]);
  
  // Update template when project configuration changes
  const updateTemplateWithNewConfig = (newConfig) => {
    if (!selectedTemplate) return;
    
    const projectInfo = getProjectInfoFromConfig(newConfig);
    console.log('Updating template with new config, project info:', projectInfo);
    
    // Update the variables with the new project info
    const updatedVariables = updateVariablesWithProjectInfo(variables, projectInfo);
    
    // If project rules exist, update the project_rules_section variable
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'project_rules_section') && 
        newConfig.projectRules && 
        newConfig.projectRules.trim() !== '') {
      updatedVariables.project_rules_section = newConfig.projectRules;
    }
    
    // Update the variables state
    setVariables(updatedVariables);
    
    // Update the final prompt
    updateFinalPrompt(selectedTemplate.template, updatedVariables);
  };
  
  // Get project info from a specific config object
  const getProjectInfoFromConfig = (config) => {
    if (!config) return {};
    
    // Determine the language based on project type and typescript flag
    let language = 'javascript';
    if (config.typescript) {
      language = 'typescript';
    } else if (config.projectType) {
      language = config.projectType.toLowerCase();
    }
    
    // Create a formatted tech stack string
    let techStack = [];
    if (config.projectType) techStack.push(config.projectType);
    if (config.framework && config.framework !== 'none') {
      techStack.push(config.framework === 'other' ? config.customFramework : config.framework);
    }
    if (config.cssFramework && config.cssFramework !== 'none') techStack.push(config.cssFramework);
    if (config.stateManagement && config.stateManagement !== 'none') {
      techStack.push(config.stateManagement === 'other' ? config.customStateManagement : config.stateManagement);
    }
    if (config.typescript) techStack.push('TypeScript');
    
    // Create a formatted testing/linting string
    let qualityTools = [];
    if (config.testing && config.testing !== 'none') {
      qualityTools.push(config.testing === 'other' ? config.customTesting : config.testing);
    }
    if (config.linter && config.linter !== 'none') {
      qualityTools.push(config.linter === 'other' ? config.customLinter : config.linter);
    }
    if (config.formatter && config.formatter !== 'none') {
      qualityTools.push(config.formatter === 'other' ? config.customFormatter : config.formatter);
    }
    
    // Get database info
    let database = config.database === 'other' ? config.customDatabase : config.database;
    
    // Get server info
    let serverType = config.serverType || 'local';
    let apiProtocol = config.apiProtocol || 'rest';
    
    return {
      projectType: config.projectType === 'other' ? config.customProjectType : config.projectType || 'javascript',
      language: language,
      techStack: techStack.join(', ') || 'Not specified',
      framework: (config.framework === 'other' ? config.customFramework : config.framework) || 'none',
      testing: (config.testing === 'other' ? config.customTesting : config.testing) || 'none',
      linter: (config.linter === 'other' ? config.customLinter : config.linter) || 'none',
      formatter: (config.formatter === 'other' ? config.customFormatter : config.formatter) || 'none',
      buildCommand: config.buildCommand || 'npm run build',
      devCommand: config.devCommand || 'npm run dev',
      qualityTools: qualityTools.join(', ') || 'None',
      packageManager: config.packageManager || 'npm',
      nodeVersion: config.nodeVersion || '18.x',
      outputDir: config.outputDir || 'dist',
      projectRules: config.projectRules || '',
      database: database || 'none',
      serverType: serverType,
      apiProtocol: apiProtocol
    };
  };
  
  // Function to load project configuration
  const loadProjectConfig = () => {
    const savedProjectConfig = localStorage.getItem('project-config');
    if (savedProjectConfig) {
      try {
        const config = JSON.parse(savedProjectConfig);
        console.log('Loaded project config from localStorage:', config);
        setProjectConfig(config);
        
        // If project rules exist, set the includeRules option to true
        if (config.projectRules && config.projectRules.trim() !== '') {
          setPromptOptions(prevOptions => ({
            ...prevOptions,
            includeRules: true
          }));
        }
        
        // If a template is selected, update the variables with the new config
        if (selectedTemplate) {
          console.log('Template selected, updating with new config:', selectedTemplate.id);
          updateTemplateWithNewConfig(config);
        }
      } catch (e) {
        console.error('Error loading project config:', e);
      }
    }
  };
  
  // Get project-specific information for templates
  const getProjectInfo = () => {
    if (!projectConfig) return {};
    console.log('Getting project info from config:', projectConfig);
    const info = getProjectInfoFromConfig(projectConfig);
    console.log('Project info:', info);
    return info;
  };
  
  // Handle template selection
  const handleTemplateSelect = (templateId) => {
    const selectedTemplate = templatePrompts.find((t) => t.id === templateId);
    if (selectedTemplate) {
      console.log('Template selected:', selectedTemplate.id);
      setSelectedTemplate(selectedTemplate);
      
      // Initialize variables with defaults from the template
    const initialVariables = {};
      selectedTemplate.variables.forEach((variable) => {
        initialVariables[variable.name] = variable.default;
      });
      console.log('Initial variables:', initialVariables);
      
      // Update with project-specific information if available
      let updatedVariables = initialVariables;
      if (projectConfig) {
        console.log('Project config in handleTemplateSelect:', projectConfig);
        const projectInfo = getProjectInfo();
        console.log('Project info in handleTemplateSelect:', projectInfo);
        updatedVariables = updateVariablesWithProjectInfo(initialVariables, projectInfo);
        console.log('Updated variables in handleTemplateSelect:', updatedVariables);
      }
      
      setVariables(updatedVariables);
      
      // Generate the prompt with the default values
      updateFinalPrompt(
        selectedTemplate.template,
        updatedVariables
      );
    }
  };
  
  // Update variable value
  const handleVariableChange = (name, value) => {
    const updatedVariables = { ...variables, [name]: value };
    setVariables(updatedVariables);
    
    if (selectedTemplate) {
      updateFinalPrompt(selectedTemplate.template, updatedVariables);
    }
  };
  
  // Update the final prompt with variable replacements
  const updateFinalPrompt = (template, vars) => {
    console.log('Updating final prompt with variables:', vars);
    let result = template;
    
    // Handle special case for project_rules_section
    if (Object.prototype.hasOwnProperty.call(vars, 'project_rules_section')) {
      if (vars.project_rules_section && vars.project_rules_section.trim() !== '') {
        // Replace the variable with formatted project rules
        const formattedRules = `Project Rules:\n${vars.project_rules_section}`;
        const regex = new RegExp(`\\{\\{project_rules_section\\}\\}`, 'g');
        result = result.replace(regex, formattedRules);
      } else {
        // If no project rules, remove the line containing the variable
        const regex = new RegExp(`\\{\\{project_rules_section\\}\\}\\n?`, 'g');
        result = result.replace(regex, '');
      }
    }
    
    // Replace all variables in the format {{variable_name}}
    Object.keys(vars).forEach(key => {
      if (key === 'project_rules_section') return; // Skip, already handled

      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      
      // Skip "none" values
      const value = vars[key];
      if (value === 'none') {
        // Find lines that contain only this variable and remove them
        const lineRegex = new RegExp(`^.*\\{\\{${key}\\}\\}.*$\\n?`, 'gm');
        result = result.replace(lineRegex, '');
        
        // Also remove any lines that start with the field name followed by this variable
        const fieldLineRegex = new RegExp(`- ${key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}: \\{\\{${key}\\}\\}.*$\\n?`, 'gm');
        result = result.replace(fieldLineRegex, '');
      } else {
        result = result.replace(regex, value);
      }
    });
    
    // Clean up any empty lines or sections
    result = result.replace(/\n\s*\n\s*\n/g, '\n\n'); // Replace triple newlines with double
    result = result.replace(/\n\s*\n$/g, '\n'); // Remove trailing empty lines
    
    console.log('Final prompt updated:', result);
    setFinalPrompt(result);
    setCustomPrompt(result);
  };
  
  // Save the current prompt as a custom template
  const saveCustomPrompt = () => {
    if (!newPromptName.trim()) {
      alert('Please provide a name for your prompt');
      return;
    }
    
    const newCustomPrompt = {
      id: `custom-${Date.now()}`,
      title: newPromptName,
      description: newPromptDescription,
      template: customPrompt,
      isCustom: true,
      date: new Date().toISOString()
    };
    
    const updatedPrompts = [...savedPrompts, newCustomPrompt];
    setSavedPrompts(updatedPrompts);
    
    // Save to localStorage
    localStorage.setItem('pastemax-custom-prompts', JSON.stringify(updatedPrompts));
    
    // Reset form
    setNewPromptName('');
    setNewPromptDescription('');
    
    // Show feedback
    alert('Prompt saved successfully!');
  };
  
  // Delete a saved custom prompt
  const deleteCustomPrompt = (id) => {
    const updatedPrompts = savedPrompts.filter(prompt => prompt.id !== id);
    setSavedPrompts(updatedPrompts);
    
    // Update localStorage
    localStorage.setItem('pastemax-custom-prompts', JSON.stringify(updatedPrompts));
  };
  
  // Paste content to the selected text area in the browser and optionally submit the form
  const pasteToTextArea = (autoSubmit = false) => {
    // Get the appropriate prompt based on the active tab
    let contentToPaste = '';
    
    if (activeTab === 'user') {
      // For user tab, directly use the current userPrompt which already contains requirement if needed
      contentToPaste = userPrompt;
      
      // Add requirement manually if not already in the prompt
      if (userRequirement && userRequirement.trim() !== '' && 
          !contentToPaste.includes(`I need help with: ${userRequirement.trim()}`)) {
        contentToPaste = `I need help with: ${userRequirement.trim()}\n\n${contentToPaste}`;
      }
    } else {
      // For other tabs
      contentToPaste = finalPrompt || customPrompt;
    }
    
    if (!contentToPaste || contentToPaste.trim() === '') {
      alert('No content to paste. Please create or select a prompt first.');
      return;
    }
    
    // Check if there's a selected element in the browser
    if (window.electron) {
      // Get the webview element
      const webviews = document.querySelectorAll('webview');
      if (webviews.length === 0) {
        alert('No browser window is open. Please open a browser and select a text area first.');
        return;
      }
      
      // Use the first webview found (we could make this more specific in the future)
      const webview = webviews[0];
      
      // If autoSubmit is true, first let the user select the submit button
      if (autoSubmit) {
        webview.executeJavaScript(`
          (function() {
            // First check if we have a selected element
            if (!window.pasteMaxSelectedElement) {
              alert('No text area is selected. Please use the "Select text area" option first.');
              return { success: false };
            }
            
            // Create a highlight effect for buttons
            const style = document.createElement('style');
            style.id = 'pastemax-button-selector-style';
            style.textContent = \`
              .pastemax-button-highlight {
                outline: 3px solid #4caf50 !important;
                outline-offset: 2px !important;
                cursor: pointer !important;
                box-shadow: 0 0 10px rgba(76, 175, 80, 0.5) !important;
                transition: all 0.2s ease !important;
                position: relative !important;
                z-index: 9999 !important;
              }
              .pastemax-button-highlight:hover {
                outline-color: #388e3c !important;
                box-shadow: 0 0 15px rgba(76, 175, 80, 0.7) !important;
              }
              .pastemax-button-tooltip {
                position: fixed;
                background-color: #333;
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 999999;
                pointer-events: none;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
              }
            \`;
            document.head.appendChild(style);
            
            // Create tooltip element
            const tooltip = document.createElement('div');
            tooltip.className = 'pastemax-button-tooltip';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
            
            // Create a floating message to show instructions
            const instructions = document.createElement('div');
            instructions.style.position = 'fixed';
            instructions.style.top = '10px';
            instructions.style.left = '50%';
            instructions.style.transform = 'translateX(-50%)';
            instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            instructions.style.color = 'white';
            instructions.style.padding = '10px 15px';
            instructions.style.borderRadius = '5px';
            instructions.style.zIndex = '999999';
            instructions.style.fontSize = '14px';
            instructions.style.fontFamily = 'Arial, sans-serif';
            instructions.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
            instructions.style.display = 'flex';
            instructions.style.alignItems = 'center';
            instructions.style.gap = '10px';
            
            const instructionsText = document.createElement('span');
            instructionsText.textContent = 'Click on the submit/send button you want to use after pasting.';
            
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.backgroundColor = '#555';
            cancelButton.style.border = 'none';
            cancelButton.style.color = 'white';
            cancelButton.style.padding = '5px 10px';
            cancelButton.style.borderRadius = '3px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.style.marginLeft = '10px';
            
            instructions.appendChild(instructionsText);
            instructions.appendChild(cancelButton);
            document.body.appendChild(instructions);
            
            // Track if selection mode is active
            let selectionModeActive = true;
            let selectedButton = null;
            
            // Function to clean up all added elements and event listeners
            function cleanup() {
              // Remove styles and tooltips
              const styleElement = document.getElementById('pastemax-button-selector-style');
              if (styleElement) styleElement.remove();
              
              if (tooltip) tooltip.remove();
              if (instructions) instructions.remove();
              
              // Remove highlight classes
              document.querySelectorAll('.pastemax-button-highlight').forEach(el => {
                el.classList.remove('pastemax-button-highlight');
                el.removeEventListener('mouseover', handleMouseOver);
                el.removeEventListener('mouseout', handleMouseOut);
                el.removeEventListener('click', handleClick);
              });
              
              document.removeEventListener('keydown', handleKeyDown);
              
              selectionModeActive = false;
            }
            
            // Add event listener to cancel button
            cancelButton.addEventListener('click', function() {
              cleanup();
              window.pasteMaxSelectedButton = null;
            });
            
            // Handle escape key to exit selection mode
            function handleKeyDown(e) {
              if (e.key === 'Escape') {
                cleanup();
                window.pasteMaxSelectedButton = null;
              }
            }
            
            // Add event listener for escape key
            document.addEventListener('keydown', handleKeyDown);
            
            // Handle mouse over event
            function handleMouseOver(e) {
              if (!selectionModeActive) return;
              
              const element = e.target;
              
              // Show tooltip
              tooltip.textContent = 'Click to select this button';
              tooltip.style.display = 'block';
              tooltip.style.left = (e.pageX + 10) + 'px';
              tooltip.style.top = (e.pageY + 10) + 'px';
            }
            
            // Handle mouse out event
            function handleMouseOut() {
              if (!selectionModeActive) return;
              tooltip.style.display = 'none';
            }
            
            // Handle click event
            function handleClick(e) {
              if (!selectionModeActive) return;
              
              e.preventDefault();
              e.stopPropagation();
              
              selectedButton = e.target;
              window.pasteMaxSelectedButton = selectedButton;
              
              // Update instructions
              instructionsText.textContent = 'Button selected! Ready to paste and submit.';
              cancelButton.textContent = 'Done';
              
              // Clean up highlights but keep the instructions
              document.querySelectorAll('.pastemax-button-highlight').forEach(el => {
                if (el !== selectedButton) {
                  el.classList.remove('pastemax-button-highlight');
                }
                el.removeEventListener('mouseover', handleMouseOver);
                el.removeEventListener('mouseout', handleMouseOut);
                el.removeEventListener('click', handleClick);
              });
              
              tooltip.remove();
              
              return true;
            }
            
            // Find all potential buttons
            const potentialButtons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.button, .btn, [role="button"]'));
            
            // Add highlight class and event listeners to all elements
            potentialButtons.forEach(button => {
              button.classList.add('pastemax-button-highlight');
              button.addEventListener('mouseover', handleMouseOver);
              button.addEventListener('mouseout', handleMouseOut);
              button.addEventListener('click', handleClick);
            });
            
            return { success: true, selectionStarted: true };
          })();
        `).then(result => {
          if (result && result.success && result.selectionStarted) {
            console.log('Button selection mode started');
          } else {
            console.log('Failed to start button selection mode');
          }
        }).catch(err => {
          console.error('Error starting button selection:', err);
        });
        
        return;
      }
      
      // Execute script to check if an element is selected and paste content
      webview.executeJavaScript(`
        (function() {
          // Check if we have a selected element from our previous selection
          if (window.pasteMaxSelectedElement) {
            const element = window.pasteMaxSelectedElement;
            
            // Check if the element still exists in the DOM
            if (document.body.contains(element)) {
              // Focus the element
              element.focus();
              
              // Store the current selection/cursor position
              let selectionStart = 0;
              let selectionEnd = 0;
              
              if (element.tagName.toLowerCase() === 'textarea' || 
                 (element.tagName.toLowerCase() === 'input' && 
                  ['text', 'search', 'email', 'password', 'tel', 'url'].includes(element.type))) {
                
                // Save current selection/cursor position
                selectionStart = element.selectionStart;
                selectionEnd = element.selectionEnd;
                
                // Get current value
                const currentValue = element.value;
                
                // If there's a selection, replace it with the new content
                if (selectionStart !== selectionEnd) {
                  const newValue = currentValue.substring(0, selectionStart) + 
                                  ${JSON.stringify(contentToPaste)} + 
                                  currentValue.substring(selectionEnd);
                  element.value = newValue;
                  
                  // Set cursor position after the inserted text
                  const newPosition = selectionStart + ${JSON.stringify(contentToPaste)}.length;
                  element.setSelectionRange(newPosition, newPosition);
                } else {
                  // If no selection, insert at cursor position
                  const newValue = currentValue.substring(0, selectionStart) + 
                                  ${JSON.stringify(contentToPaste)} + 
                                  currentValue.substring(selectionStart);
                  element.value = newValue;
                  
                  // Set cursor position after the inserted text
                  const newPosition = selectionStart + ${JSON.stringify(contentToPaste)}.length;
                  element.setSelectionRange(newPosition, newPosition);
                }
                
                // Trigger input event to notify any listeners
                const event = new Event('input', { bubbles: true });
                element.dispatchEvent(event);
                
                // If we have a selected button, click it
                if (window.pasteMaxSelectedButton && document.body.contains(window.pasteMaxSelectedButton)) {
                  setTimeout(() => {
                    window.pasteMaxSelectedButton.click();
                  }, 100);
                  return { success: true, submitted: true };
                }
                
                return { success: true, submitted: false };
              } else if (element.isContentEditable) {
                // For contenteditable elements, we need to handle selection differently
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                
                // Insert the content at the current selection
                range.deleteContents();
                const textNode = document.createTextNode(${JSON.stringify(contentToPaste)});
                range.insertNode(textNode);
                
                // Move the cursor to the end of the inserted text
                range.setStartAfter(textNode);
                range.setEndAfter(textNode);
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Trigger input event
                const event = new Event('input', { bubbles: true });
                element.dispatchEvent(event);
                
                // If we have a selected button, click it
                if (window.pasteMaxSelectedButton && document.body.contains(window.pasteMaxSelectedButton)) {
                  setTimeout(() => {
                    window.pasteMaxSelectedButton.click();
                  }, 100);
                  return { success: true, submitted: true };
                }
                
                return { success: true, submitted: false };
              }
            }
          }
          
          alert('No text area is selected. Please use the "Select text area" option first.');
          return { success: false };
        })();
      `).then(result => {
        if (result && result.success) {
          console.log('Content pasted successfully');
          if (result.submitted === true) {
            console.log('Form submitted successfully');
          }
        } else {
          console.log('Failed to paste content');
        }
      }).catch(err => {
        console.error('Error pasting content:', err);
        alert('Error pasting content to text area');
      });
    } else {
      alert('This feature requires Electron to work. It is not available in browser mode.');
    }
  };
  
  // Save the user prompt directly
  const saveUserPrompt = () => {
    const promptName = 'User Prompt ' + new Date().toLocaleDateString();
    const promptDescription = 'Saved from User Prompt tab';
    
    const newCustomPrompt = {
      id: `custom-${Date.now()}`,
      title: promptName,
      description: promptDescription,
      template: userPrompt,
      isCustom: true,
      date: new Date().toISOString()
    };
    
    const updatedPrompts = [...savedPrompts, newCustomPrompt];
    setSavedPrompts(updatedPrompts);
    
    // Save to localStorage
    localStorage.setItem('pastemax-custom-prompts', JSON.stringify(updatedPrompts));
    
    // Show feedback
    alert('Prompt saved successfully!');
  };
  
  // Generate preview content based on selected options
  const generatePreviewContent = () => {
    // Log the selectedFiles for debugging
    console.log('generatePreviewContent using internalSelectedFiles:', internalSelectedFiles);
    
    // Normalize path function for consistent display
    const normalizeFilePath = (path) => {
      return path.replace(/\\/g, '/');
    };
    
    let previewPrompt = '';
    
    if (projectConfig) {
      const projectInfo = getProjectInfo();
      
      // Add project information based on selected options
      if (promptOptions.includeProgrammingLanguage || promptOptions.includeFramework || 
          promptOptions.includeTechStack || promptOptions.includeProjectConfig) {
        
        previewPrompt += 'Project Information:\n';
        
        if (promptOptions.includeProgrammingLanguage && projectInfo.language) {
          previewPrompt += `- Language: ${projectInfo.language}\n`;
        }
        
        if (promptOptions.includeFramework && projectInfo.framework && projectInfo.framework !== 'none') {
          previewPrompt += `- Framework: ${projectInfo.framework}\n`;
        }
        
        if (promptOptions.includeTechStack && projectInfo.techStack && projectInfo.techStack !== 'Not specified') {
          previewPrompt += `- Tech Stack: ${projectInfo.techStack}\n`;
        }
        
        if (promptOptions.includeProjectConfig) {
          if (projectInfo.testing && projectInfo.testing !== 'none') {
            previewPrompt += `- Testing: ${projectInfo.testing}\n`;
          }
          if (projectInfo.linter && projectInfo.linter !== 'none') {
            previewPrompt += `- Linter: ${projectInfo.linter}\n`;
          }
          if (projectInfo.formatter && projectInfo.formatter !== 'none') {
            previewPrompt += `- Formatter: ${projectInfo.formatter}\n`;
          }
          if (projectInfo.buildCommand) {
            previewPrompt += `- Build Command: ${projectInfo.buildCommand}\n`;
          }
          if (projectInfo.devCommand) {
            previewPrompt += `- Dev Command: ${projectInfo.devCommand}\n`;
          }
          if (projectInfo.serverType && projectInfo.serverType !== 'local') {
            previewPrompt += `- Server Type: ${projectInfo.serverType}\n`;
          }
          if (projectInfo.apiProtocol && projectInfo.apiProtocol !== 'rest') {
            previewPrompt += `- API Protocol: ${projectInfo.apiProtocol}\n`;
          }
          if (projectInfo.database && projectInfo.database !== 'none') {
            previewPrompt += `- Database: ${projectInfo.database}\n`;
          }
        }
      }
    }
    
    // Add project rules if option is checked
    if (promptOptions.includeRules && projectRules) {
      // Add a separator if there's already content in preview
      if (previewPrompt.trim() !== '') {
        previewPrompt += '\n';
      }
      
      previewPrompt += 'Project Rules:\n';
      previewPrompt += projectRules + '\n';
    }
    
    // Add project paths if option is checked
    if (promptOptions.includeProjectPaths && internalSelectedFiles.length > 0) {
      // Add a separator if there's already content in preview
      if (previewPrompt.trim() !== '') {
        previewPrompt += '\n';
      }
      
      previewPrompt += 'Project Paths:\n';
      internalSelectedFiles.forEach(file => {
        previewPrompt += `- ${normalizeFilePath(file.path)}\n`;
      });
    } else if (promptOptions.includeProjectPaths) {
      // If option is checked but no files are selected
      if (previewPrompt.trim() !== '') {
        previewPrompt += '\n';
      }
      previewPrompt += 'Project Paths: No files selected\n';
    }
    
    // Add selected files if option is checked
    if (promptOptions.includeSelectedFiles && internalSelectedFiles.length > 0) {
      // Add a separator if there's already content in preview
      if (previewPrompt.trim() !== '') {
        previewPrompt += '\n';
      }
      
      previewPrompt += 'Selected Files:\n';
      internalSelectedFiles.forEach(file => {
        previewPrompt += `- ${normalizeFilePath(file.path)}\n`;
      });
      
      // Add file contents if there are fewer than 5 files
      if (internalSelectedFiles.length <= 5) {
        previewPrompt += '\nFile Contents:\n';
        internalSelectedFiles.forEach(file => {
          previewPrompt += `\n--- ${normalizeFilePath(file.path)} ---\n`;
          previewPrompt += `${file.content || 'Content not available'}\n`;
        });
      } else {
        previewPrompt += '\nToo many files selected to include contents. Please narrow your selection to view file contents.\n';
      }
    } else if (promptOptions.includeSelectedFiles) {
      // If option is checked but no files are selected
      if (previewPrompt.trim() !== '') {
        previewPrompt += '\n';
      }
      previewPrompt += 'Selected Files: No files selected\n';
    }
    
    return previewPrompt;
  };
  
  // Helper function to update the preview content
  const updatePreviewFromOptions = useCallback(() => {
    // No longer needed - options directly modify the prompt
  }, []);
  
  // Update preview when prompt options change
  useEffect(() => {
    // Save options to localStorage
    localStorage.setItem('pastemax-prompt-options', JSON.stringify(promptOptions));
  }, [promptOptions]);
  
  // Update preview when user prompt changes
  useEffect(() => {
    // No longer needed - options directly modify the prompt
  }, [userPrompt, activeTab]);
  
  // Handler for checkbox option changes
  const handleOptionChange = (optionName, value) => {
    // Update the promptOptions state with the new value
    setPromptOptions(prevOptions => {
      const newOptions = {
        ...prevOptions,
        [optionName]: value
      };

      // Create a copy of the current sections
      const sections = { ...(prevOptions._sections || {}) };
      
      if (value) {
        // Add the section
        addSectionToPrompt(optionName);
      } else {
        // Remove the section from sections
        delete sections[optionName];
        
        // Update with the section removed
        updatePromptContent(sections);
      }

      return {
        ...newOptions,
        _sections: sections
      };
    });
  };

  // Update prompt directly based on option changes
  const updatePromptWithOptions = (isChecked, optionName) => {
    if (isChecked) {
      // Add the section
      addSectionToPrompt(optionName);
    } else {
      // Create a copy of the current sections
      const sections = { ...(promptOptions._sections || {}) };
      
      // Remove the section
      delete sections[optionName];
      
      // Update with the section removed
      updatePromptContent(sections);
    }
  };
  
  // Add a section to the user prompt
  const addSectionToPrompt = (optionName) => {
    // Generate the section content without tags
    let sectionContent = "";
    const projectInfo = projectConfig ? getProjectInfo() : {};
    
    switch(optionName) {
      case 'includeProgrammingLanguage':
        if (projectInfo.language) {
          sectionContent = `Language: ${projectInfo.language}`;
        }
        break;
      case 'includeFramework':
        if (projectInfo.framework && projectInfo.framework !== 'none') {
          sectionContent = `Framework: ${projectInfo.framework}`;
        }
        break;
      case 'includeTechStack':
        if (projectInfo.techStack && projectInfo.techStack !== 'Not specified') {
          sectionContent = `Tech Stack: ${projectInfo.techStack}`;
        }
        break;
      case 'includeRules':
        if (projectRules && projectRules.trim() !== '') {
          sectionContent = `Project Rules:\n${projectRules}`;
        }
        break;
      case 'includeProjectConfig':
        if (projectInfo) {
          sectionContent = `Project Configuration:`;
          
          if (projectInfo.testing && projectInfo.testing !== 'none') {
            sectionContent += `\n- Testing: ${projectInfo.testing}`;
          }
          if (projectInfo.linter && projectInfo.linter !== 'none') {
            sectionContent += `\n- Linter: ${projectInfo.linter}`;
          }
          if (projectInfo.formatter && projectInfo.formatter !== 'none') {
            sectionContent += `\n- Formatter: ${projectInfo.formatter}`;
          }
          if (projectInfo.buildCommand) {
            sectionContent += `\n- Build Command: ${projectInfo.buildCommand}`;
          }
          if (projectInfo.devCommand) {
            sectionContent += `\n- Dev Command: ${projectInfo.devCommand}`;
          }
          if (projectInfo.serverType && projectInfo.serverType !== 'local') {
            sectionContent += `\n- Server Type: ${projectInfo.serverType}`;
          }
          if (projectInfo.apiProtocol && projectInfo.apiProtocol !== 'rest') {
            sectionContent += `\n- API Protocol: ${projectInfo.apiProtocol}`;
          }
          if (projectInfo.database && projectInfo.database !== 'none') {
            sectionContent += `\n- Database: ${projectInfo.database}`;
          }
        }
        break;
      case 'includeSelectedFiles':
        if (internalSelectedFiles.length > 0) {
          sectionContent = `Selected Files:`;
          internalSelectedFiles.forEach(file => {
            const normalizedPath = file.path.replace(/\\/g, '/');
            sectionContent += `\n- ${normalizedPath}`;
          });
          
          // Add file contents if there are fewer than 5 files
          if (internalSelectedFiles.length <= 5) {
            sectionContent += '\n\nFile Contents:';
            internalSelectedFiles.forEach(file => {
              const normalizedPath = file.path.replace(/\\/g, '/');
              sectionContent += `\n\n--- ${normalizedPath} ---\n`;
              sectionContent += `${file.content || 'Content not available'}`;
            });
          } else {
            sectionContent += '\n\nToo many files selected to include contents. Please narrow your selection to view file contents.';
          }
        }
        break;
      case 'includeProjectPaths':
        if (internalSelectedFiles.length > 0) {
          sectionContent = `Project Paths:`;
          internalSelectedFiles.forEach(file => {
            const normalizedPath = file.path.replace(/\\/g, '/');
            sectionContent += `\n- ${normalizedPath}`;
          });
        }
        break;
      default:
        break;
    }
    
    // Add section to prompt if we have content
    if (sectionContent) {
      // Create a copy of the current sections
      const sections = { ...(promptOptions._sections || {}) };
      
      // Add the new section
      sections[optionName] = {
        optionName,
        content: sectionContent
      };
      
      // Update prompt with all sections
      updatePromptContent(sections);
    }
  };
  
  // Update the entire prompt content based on active sections
  const updatePromptContent = (sections) => {
    // Get the current user prompt
    let currentPrompt = userPrompt;

    // Create an array to store all sections content
    const sectionContents = [];

    // Add sections in a consistent order
    const orderedSections = [
      'includeProgrammingLanguage',
      'includeFramework', 
      'includeTechStack',
      'includeProjectConfig',
      'includeRules',
      'includeProjectPaths',
      'includeSelectedFiles'
    ];

    // Collect all section content
    for (const optionName of orderedSections) {
      if (sections[optionName] && sections[optionName].content) {
        sectionContents.push(sections[optionName].content);
      }
    }

    // Join all sections with double newlines
    const allSectionsContent = sectionContents.join('\n\n');

    // If there's a requirement, handle it specially
    if (userRequirement && userRequirement.trim() !== '') {
      const requirementText = `I need help with: ${userRequirement.trim()}`;

      // If there are no sections to add
      if (!allSectionsContent) {
        setUserPrompt(requirementText);
        return;
      }

      // Check if sections were before or after the requirement text in the original prompt
      const requirementIndex = currentPrompt.indexOf(requirementText);
      const firstSectionIndex = Object.values(sections)
        .filter(section => section && section.content)
        .reduce((earliest, section) => {
          const index = currentPrompt.indexOf(section.content);
          return index !== -1 && (earliest === -1 || index < earliest) ? index : earliest;
        }, -1);

      // If this is the first time adding sections or they were after the requirement
      if (firstSectionIndex === -1 || (requirementIndex !== -1 && requirementIndex < firstSectionIndex)) {
        setUserPrompt(`${requirementText}\n\n${allSectionsContent}`);
      } else {
        // Sections were before the requirement
        setUserPrompt(`${allSectionsContent}\n\n${requirementText}`);
      }
    } else {
      // No requirement text, just use the sections
      setUserPrompt(allSectionsContent);
    }

    // Create a new options object with the updated sections
    const newOptions = {
      ...promptOptions,
      _sections: sections
    };

    // Update checkbox states to reflect what sections are actually included
    orderedSections.forEach(optionName => {
      // Set each option based on whether the section exists
      newOptions[optionName] = !!sections[optionName];
    });

    // Store sections info in the promptOptions state
    setPromptOptions(newOptions);
  };
  
  // Remove a section from the user prompt
  const removeSectionFromPrompt = (optionName) => {
    // Get current sections
    const sections = {...(promptOptions._sections || {})};
    
    // Remove the section
    delete sections[optionName];
    
    // Update the prompt
    updatePromptContent(sections);
  };
  
  // Copy prompt to clipboard
  const copyToClipboard = () => {
    // Get the appropriate prompt based on the active tab
    let promptToCopy = '';
    
    if (activeTab === 'user') {
      // For user tab, directly use the current userPrompt which already contains requirement if needed
      promptToCopy = userPrompt;
      
      // Add requirement manually if not already in the prompt
      if (userRequirement && userRequirement.trim() !== '' && 
          !promptToCopy.includes(`I need help with: ${userRequirement.trim()}`)) {
        promptToCopy = `I need help with: ${userRequirement.trim()}\n\n${promptToCopy}`;
      }
    } else {
      // For other tabs
      promptToCopy = finalPrompt || customPrompt;
    }
      
    navigator.clipboard.writeText(promptToCopy)
      .then(() => {
        alert('Prompt copied to clipboard!');
      })
      .catch(err => {
        console.error('Error copying to clipboard:', err);
        alert('Failed to copy to clipboard');
      });
  };
  
  // Apply the prompt (placeholder for future integration)
  const applyPrompt = () => {
    setLoading(true);
    
    // Get the appropriate prompt based on the active tab
    let promptToApply = '';
    
    if (activeTab === 'user') {
      // For user tab, directly use the current userPrompt which already contains requirement if needed
      promptToApply = userPrompt;
      
      // Add requirement manually if not already in the prompt
      if (userRequirement && userRequirement.trim() !== '' && 
          !promptToApply.includes(`I need help with: ${userRequirement.trim()}`)) {
        promptToApply = `I need help with: ${userRequirement.trim()}\n\n${promptToApply}`;
      }
    } else {
      // For other tabs
      promptToApply = finalPrompt || customPrompt;
    }
    
    // Simulate sending to an AI service
    setTimeout(() => {
      setLoading(false);
      alert('Prompt applied! This would send the prompt to the AI service in a real implementation.');
      console.log('Applied prompt:', promptToApply);
    }, 1000);
  };
  
  // Initialize sections from options
  useEffect(() => {
    // Load saved prompt options from localStorage
    const savedPromptOptions = localStorage.getItem('pastemax-prompt-options');
    if (savedPromptOptions) {
      try {
        const parsedOptions = JSON.parse(savedPromptOptions);
        setPromptOptions(prevOptions => ({
          ...prevOptions,
          ...parsedOptions
        }));
      } catch (e) {
        console.error('Error loading prompt options:', e);
      }
    }

    // Set up all enabled sections at once
    const enabledSections = {};
    let hasEnabledSections = false;
    
    // Create a single sections object with all enabled options
    Object.keys(promptOptions).forEach(key => {
      if (key.startsWith('include') && key !== '_sections' && promptOptions[key] === true) {
        // Generate and collect the section content
        let sectionContent = "";
        const projectInfo = projectConfig ? getProjectInfo() : {};
        
        switch(key) {
          case 'includeProgrammingLanguage':
            if (projectInfo.language) {
              sectionContent = `Language: ${projectInfo.language}`;
            }
            break;
          case 'includeFramework':
            if (projectInfo.framework && projectInfo.framework !== 'none') {
              sectionContent = `Framework: ${projectInfo.framework}`;
            }
            break;
          case 'includeTechStack':
            if (projectInfo.techStack && projectInfo.techStack !== 'Not specified') {
              sectionContent = `Tech Stack: ${projectInfo.techStack}`;
            }
            break;
          case 'includeRules':
            if (projectRules && projectRules.trim() !== '') {
              sectionContent = `Project Rules:\n${projectRules}`;
            }
            break;
          case 'includeProjectConfig':
            if (projectInfo) {
              sectionContent = `Project Configuration:`;
              if (projectInfo.testing && projectInfo.testing !== 'none') {
                sectionContent += `\n- Testing: ${projectInfo.testing}`;
              }
              if (projectInfo.linter && projectInfo.linter !== 'none') {
                sectionContent += `\n- Linter: ${projectInfo.linter}`;
              }
              if (projectInfo.formatter && projectInfo.formatter !== 'none') {
                sectionContent += `\n- Formatter: ${projectInfo.formatter}`;
              }
              if (projectInfo.buildCommand) {
                sectionContent += `\n- Build Command: ${projectInfo.buildCommand}`;
              }
              if (projectInfo.devCommand) {
                sectionContent += `\n- Dev Command: ${projectInfo.devCommand}`;
              }
              if (projectInfo.serverType && projectInfo.serverType !== 'local') {
                sectionContent += `\n- Server Type: ${projectInfo.serverType}`;
              }
              if (projectInfo.apiProtocol && projectInfo.apiProtocol !== 'rest') {
                sectionContent += `\n- API Protocol: ${projectInfo.apiProtocol}`;
              }
              if (projectInfo.database && projectInfo.database !== 'none') {
                sectionContent += `\n- Database: ${projectInfo.database}`;
              }
            }
            break;
          case 'includeSelectedFiles':
            if (internalSelectedFiles.length > 0) {
              sectionContent = `Selected Files:`;
              internalSelectedFiles.forEach(file => {
                const normalizedPath = file.path.replace(/\\/g, '/');
                sectionContent += `\n- ${normalizedPath}`;
              });
              
              // Add file contents if there are fewer than 5 files
              if (internalSelectedFiles.length <= 5) {
                sectionContent += '\n\nFile Contents:';
                internalSelectedFiles.forEach(file => {
                  const normalizedPath = file.path.replace(/\\/g, '/');
                  sectionContent += `\n\n--- ${normalizedPath} ---\n`;
                  sectionContent += `${file.content || 'Content not available'}`;
                });
              } else {
                sectionContent += '\n\nToo many files selected to include contents. Please narrow your selection to view file contents.';
              }
            }
            break;
          case 'includeProjectPaths':
            if (internalSelectedFiles.length > 0) {
              sectionContent = `Project Paths:`;
              internalSelectedFiles.forEach(file => {
                const normalizedPath = file.path.replace(/\\/g, '/');
                sectionContent += `\n- ${normalizedPath}`;
              });
            }
            break;
        }
        
        // If we have content, add it to the sections
        if (sectionContent) {
          enabledSections[key] = {
            optionName: key,
            content: sectionContent
          };
          hasEnabledSections = true;
        }
      }
    });
    
    // If we have any sections, update the prompt
    if (hasEnabledSections) {
      // Wait a bit to ensure all state is initialized
      setTimeout(() => {
        updatePromptContent(enabledSections);
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <div className="prompt-container">
      <div className="prompt-header">
        <h1 className="prompt-title">Prompt Engineering</h1>
      </div>
      
      <div className="prompt-tabs">
        <div 
          className={`prompt-tab ${activeTab === 'user' ? 'active' : ''}`}
          onClick={() => setActiveTab('user')}
        >
          User Prompt
        </div>
        <div 
          className={`prompt-tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Template Prompts
        </div>
        <div 
          className={`prompt-tab ${activeTab === 'custom' ? 'active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          Custom Prompt
        </div>
        <div 
          className={`prompt-tab ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          Saved Prompts
        </div>
      </div>
      
      {activeTab === 'user' && (
        <>
          <div className="prompt-user-container" style={{ display: 'flex', gap: '20px' }}>
            <div className="prompt-editor" style={{ flex: '1' }}>
              <div className="prompt-editor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 className="prompt-editor-title">User Prompt</h3>
              </div>
              
              <div className="prompt-requirement-section" style={{ marginBottom: '15px' }}>
                <label htmlFor="user-requirement" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  What do you need help with?
                </label>
                <textarea
                  id="user-requirement"
                  className="prompt-requirement-textarea"
                  value={userRequirement}
                  onChange={(e) => setUserRequirement(e.target.value)}
                  placeholder="Describe what you need help with..."
                  style={{ 
                    width: '100%',
                    minHeight: '80px',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <textarea
                ref={editorRef}
                className="prompt-editor-textarea"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Write your prompt here..."
                style={{ minHeight: '300px' }}
              />
            </div>
            
            <div className="prompt-options-panel" style={{ 
              width: '300px', 
              backgroundColor: 'var(--background-secondary)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <h3 style={{ margin: '0 0 12px 0' }}>Prompt Options</h3>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-language" 
                  checked={!!promptOptions.includeProgrammingLanguage}
                  onChange={(e) => handleOptionChange('includeProgrammingLanguage', e.target.checked)}
                />
                <label htmlFor="include-language">Programming Language</label>
              </div>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-framework" 
                  checked={!!promptOptions.includeFramework}
                  onChange={(e) => handleOptionChange('includeFramework', e.target.checked)}
                />
                <label htmlFor="include-framework">Framework</label>
              </div>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-tech-stack" 
                  checked={!!promptOptions.includeTechStack}
                  onChange={(e) => handleOptionChange('includeTechStack', e.target.checked)}
                />
                <label htmlFor="include-tech-stack">Tech Stack</label>
              </div>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-rules" 
                  checked={!!promptOptions.includeRules}
                  onChange={(e) => handleOptionChange('includeRules', e.target.checked)}
                />
                <label htmlFor="include-rules">Project Rules</label>
              </div>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-project-config" 
                  checked={!!promptOptions.includeProjectConfig}
                  onChange={(e) => handleOptionChange('includeProjectConfig', e.target.checked)}
                />
                <label htmlFor="include-project-config">Project Configuration</label>
              </div>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-selected-files" 
                  checked={!!promptOptions.includeSelectedFiles}
                  onChange={(e) => handleOptionChange('includeSelectedFiles', e.target.checked)}
                  disabled={internalSelectedFiles.length === 0}
                />
                <label 
                  htmlFor="include-selected-files"
                  style={{ color: internalSelectedFiles.length === 0 ? 'var(--text-muted)' : 'var(--text-color)' }}
                >
                  Selected Files {internalSelectedFiles.length === 0 ? '(none selected)' : `(${internalSelectedFiles.length})`}
                </label>
              </div>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-project-paths" 
                  checked={!!promptOptions.includeProjectPaths}
                  onChange={(e) => handleOptionChange('includeProjectPaths', e.target.checked)}
                  disabled={internalSelectedFiles.length === 0}
                />
                <label 
                  htmlFor="include-project-paths"
                  style={{ color: internalSelectedFiles.length === 0 ? 'var(--text-muted)' : 'var(--text-color)' }}
                >
                  Project Paths {internalSelectedFiles.length === 0 ? '(none selected)' : `(${internalSelectedFiles.length})`}
                </label>
              </div>
            </div>
          </div>
          
          <div className="prompt-actions">
            <button 
              className="prompt-action-btn"
              onClick={copyToClipboard}
              disabled={loading}
            >
              <Copy size={16} />
              Copy to Clipboard
            </button>
            
            <button 
              className="prompt-action-btn"
              onClick={() => pasteToTextArea(false)}
              disabled={loading}
              style={{
                backgroundColor: 'var(--primary-color)',
                color: 'white'
              }}
            >
              <Clipboard size={16} />
              Paste to Text Area
            </button>
            
            <button 
              className="prompt-action-btn"
              onClick={applyPrompt}
              disabled={loading}
            >
              <Play size={16} />
              {loading ? 'Applying...' : 'Apply Prompt'}
            </button>
            
            {activeTab === 'user' && (
              <button 
                className="prompt-action-btn"
                onClick={saveUserPrompt}
                disabled={loading || !userPrompt.trim()}
              >
                <Save size={16} />
                Save Prompt
              </button>
            )}
          </div>
        </>
      )}
      
      {activeTab === 'templates' && (
        <>
          <div className="prompt-templates">
            {templatePrompts.map(template => (
              <div 
                key={template.id}
                className={`prompt-template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <h3 className="prompt-template-title">{template.title}</h3>
                <p className="prompt-template-description">{template.description}</p>
                <div className="prompt-template-tags">
                  {template.tags.map((tag, index) => (
                    <span key={index} className="prompt-template-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {selectedTemplate && (
            <>
              <div className="prompt-variables">
                <h3 className="prompt-variables-title">Template Variables</h3>
                {selectedTemplate.variables.map((variable, index) => (
                  <div key={index} className="prompt-variable-item">
                    <span className="prompt-variable-name">{variable.name}</span>
                    <input 
                      type="text"
                      className="prompt-variable-input"
                      value={variables[variable.name] || ''}
                      onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                      placeholder={variable.description}
                    />
                  </div>
                ))}
              </div>
              
              <div className="prompt-editor">
                <div className="prompt-editor-header">
                  <h3 className="prompt-editor-title">Generated Prompt</h3>
                </div>
                <textarea
                  ref={editorRef}
                  className="prompt-editor-textarea"
                  value={finalPrompt}
                  onChange={(e) => setFinalPrompt(e.target.value)}
                  placeholder="Your generated prompt will appear here..."
                />
              </div>
              
              <div className="prompt-actions">
                <button className="prompt-action-btn" onClick={copyToClipboard}>
                  <Copy size={16} />
                  Copy
                </button>
                <button className="prompt-action-btn primary" onClick={applyPrompt} disabled={loading}>
                  <Play size={16} />
                  {loading ? 'Applying...' : 'Apply Prompt'}
                </button>
              </div>
            </>
          )}
        </>
      )}
      
      {activeTab === 'custom' && (
        <>
          <div className="prompt-editor">
            <div className="prompt-editor-header">
              <h3 className="prompt-editor-title">Custom Prompt</h3>
            </div>
            <textarea
              ref={editorRef}
              className="prompt-editor-textarea"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Write your custom prompt here..."
            />
          </div>
          
          <div className="prompt-save-section">
            <h3 className="prompt-save-title">Save this prompt as a template</h3>
            <div className="prompt-save-row">
              <input
                type="text"
                className="prompt-save-input"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                placeholder="Prompt name"
              />
            </div>
            <div className="prompt-save-row">
              <input
                type="text"
                className="prompt-save-input"
                value={newPromptDescription}
                onChange={(e) => setNewPromptDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>
          </div>
          
          <div className="prompt-actions">
            <button className="prompt-action-btn" onClick={copyToClipboard}>
              <Copy size={16} />
              Copy
            </button>
            <button className="prompt-action-btn" onClick={saveCustomPrompt}>
              <Save size={16} />
              Save as Template
            </button>
            <button className="prompt-action-btn primary" onClick={applyPrompt} disabled={loading}>
              <Play size={16} />
              {loading ? 'Applying...' : 'Apply Prompt'}
            </button>
          </div>
        </>
      )}
      
      {activeTab === 'saved' && (
        <>
          <div className="prompt-templates">
            {savedPrompts.length === 0 ? (
              <div className="empty-state">
                <p>You don't have any saved prompts yet. Create a custom prompt and save it to see it here.</p>
              </div>
            ) : (
              savedPrompts.map(prompt => (
                <div 
                  key={prompt.id}
                  className="prompt-template-card"
                >
                  <button 
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCustomPrompt(prompt.id);
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--secondary-color)'
                    }}
                  >
                    <X size={16} />
                  </button>
                  <h3 className="prompt-template-title">{prompt.title}</h3>
                  <p className="prompt-template-description">{prompt.description}</p>
                  <p className="prompt-date" style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>
                    {new Date(prompt.date).toLocaleDateString()}
                  </p>
                  <div className="prompt-actions" style={{ marginTop: '12px' }}>
                    <button 
                      className="prompt-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomPrompt(prompt.template);
                        setActiveTab('custom');
                      }}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      <Edit size={14} />
                      Edit
                    </button>
                    <button 
                      className="prompt-action-btn primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCustomPrompt(prompt.template);
                        setFinalPrompt(prompt.template);
                        applyPrompt();
                      }}
                      style={{ fontSize: '12px', padding: '4px 8px' }}
                    >
                      <Play size={14} />
                      Apply
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PromptEngine; 