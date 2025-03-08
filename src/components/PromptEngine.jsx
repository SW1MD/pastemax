import React, { useState, useEffect, useRef } from 'react';
import { Save, Copy, Play, Plus, Settings, Edit, Tag, Bookmark, X, Clipboard } from 'lucide-react';

// Template prompt data
const templatePrompts = [
  {
    id: 'template-project',
    title: 'Project-Specific Help',
    description: 'Get help with your specific project configuration.',
    template: 'I need help with my {{project_type}} project. Here are the details of my project configuration:\n\n- Framework: {{framework}}\n- Tech Stack: {{tech_stack}}\n- Testing Tools: {{testing}}\n- Linter: {{linter}}\n- Formatter: {{formatter}}\n- Build Command: {{build_command}}\n- Dev Command: {{dev_command}}\n- Package Manager: {{package_manager}}\n- Node Version: {{node_version}}\n\nI need help with the following issue:\n\n{{issue_description}}\n\nPlease provide detailed guidance specific to my project configuration.',
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
  const [userPromptTab, setUserPromptTab] = useState('editor'); // 'editor' or 'preview'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [internalSelectedFiles, setInternalSelectedFiles] = useState(selectedFiles);
  const [promptOptions, setPromptOptions] = useState({
    includeProgrammingLanguage: true,
    includeFramework: true,
    includeTechStack: true,
    includeRules: false,
    includeProjectConfig: false,
    includeSelectedFiles: false,
    includeProjectPaths: false
  });
  const [promptPreview, setPromptPreview] = useState('');
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
    
    // Load saved prompt options from localStorage
    const savedPromptOptions = localStorage.getItem('pastemax-prompt-options');
    if (savedPromptOptions) {
      try {
        setPromptOptions(JSON.parse(savedPromptOptions));
      } catch (e) {
        console.error('Error loading prompt options:', e);
      }
    }
    
    // Load saved user prompt tab from localStorage
    const savedUserPromptTab = localStorage.getItem('pastemax-user-prompt-tab');
    if (savedUserPromptTab) {
      try {
        setUserPromptTab(savedUserPromptTab);
      } catch (e) {
        console.error('Error loading user prompt tab:', e);
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
  
  // Save prompt options to localStorage when they change
  useEffect(() => {
    localStorage.setItem('pastemax-prompt-options', JSON.stringify(promptOptions));
  }, [promptOptions]);
  
  // Save user prompt tab to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('pastemax-user-prompt-tab', userPromptTab);
  }, [userPromptTab]);
  
  // Update internalSelectedFiles when selectedFiles prop changes
  useEffect(() => {
    console.log('Updating internalSelectedFiles from prop:', selectedFiles);
    setInternalSelectedFiles(selectedFiles);
  }, [selectedFiles]);
  
  // Log when selectedFiles changes
  useEffect(() => {
    console.log('selectedFiles prop changed:', selectedFiles);
  }, [selectedFiles]);
  
  // Update variables with project info
  const updateVariablesWithProjectInfo = (variables, projectInfo) => {
    const updatedVariables = { ...variables };
    
    // Map project config to template variables
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'project_type')) {
      updatedVariables.project_type = projectInfo.projectType || updatedVariables.project_type;
    }
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'language')) {
      updatedVariables.language = projectInfo.language || updatedVariables.language;
    }
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'framework')) {
      updatedVariables.framework = projectInfo.framework || updatedVariables.framework;
    }
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'tech_stack')) {
      updatedVariables.tech_stack = projectInfo.techStack || updatedVariables.tech_stack;
    }
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'testing')) {
      updatedVariables.testing = projectInfo.testing || updatedVariables.testing;
    }
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'linter')) {
      updatedVariables.linter = projectInfo.linter || updatedVariables.linter;
    }
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'formatter')) {
      updatedVariables.formatter = projectInfo.formatter || updatedVariables.formatter;
    }
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'build_command')) {
      updatedVariables.build_command = projectInfo.buildCommand || updatedVariables.build_command;
    }
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'dev_command')) {
      updatedVariables.dev_command = projectInfo.devCommand || updatedVariables.dev_command;
    }
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'package_manager')) {
      updatedVariables.package_manager = projectInfo.packageManager || updatedVariables.package_manager;
    }
    if (Object.prototype.hasOwnProperty.call(updatedVariables, 'node_version')) {
      updatedVariables.node_version = projectInfo.nodeVersion || updatedVariables.node_version;
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
  
  // Update template variables when config changes
  const updateTemplateWithNewConfig = (newConfig) => {
    // Get project info based on the new config
    const projectInfo = getProjectInfoFromConfig(newConfig);
    console.log('Project info from new config:', projectInfo);
    
    // Get the current template variables
    const currentVariables = { ...variables };
    
    // Update variables with the new project info
    const updatedVariables = updateVariablesWithProjectInfo(currentVariables, projectInfo);
    console.log('Updated variables:', updatedVariables);
    
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
    
    return {
      projectType: config.projectType || 'javascript',
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
      outputDir: config.outputDir || 'dist'
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
    
    // Replace all variables in the format {{variable_name}}
    Object.keys(vars).forEach(key => {
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
  
  // Copy prompt to clipboard
  const copyToClipboard = () => {
    // Get the appropriate prompt based on the active tab
    const promptToCopy = activeTab === 'user' 
      ? userPrompt 
      : (finalPrompt || customPrompt);
      
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
    const promptToApply = activeTab === 'user' 
      ? userPrompt 
      : (finalPrompt || customPrompt);
    
    // Simulate sending to an AI service
    setTimeout(() => {
      setLoading(false);
      alert('Prompt applied! This would send the prompt to the AI service in a real implementation.');
      console.log('Applied prompt:', promptToApply);
    }, 1000);
  };
  
  // Paste content to the selected text area in the browser
  const pasteToTextArea = () => {
    // Get the appropriate prompt based on the active tab
    const contentToPaste = activeTab === 'user' 
      ? (userPromptTab === 'preview' ? promptPreview : userPrompt)
      : (finalPrompt || customPrompt);
    
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
              
              // Paste content based on element type
              if (element.tagName.toLowerCase() === 'textarea' || 
                 (element.tagName.toLowerCase() === 'input' && 
                  ['text', 'search', 'email', 'password', 'tel', 'url'].includes(element.type))) {
                // For input and textarea elements, we can set the value directly
                element.value = ${JSON.stringify(contentToPaste)};
                
                // Trigger input event to notify any listeners
                const event = new Event('input', { bubbles: true });
                element.dispatchEvent(event);
                
                return true;
              } else if (element.isContentEditable) {
                // For contenteditable elements
                element.innerHTML = ${JSON.stringify(contentToPaste)};
                
                // Trigger input event
                const event = new Event('input', { bubbles: true });
                element.dispatchEvent(event);
                
                return true;
              }
            }
          }
          
          alert('No text area is selected. Please use the "Select text area" option first.');
          return false;
        })();
      `).then(result => {
        if (result) {
          console.log('Content pasted successfully');
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
        previewPrompt += `- ${file.path}\n`;
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
        previewPrompt += `- ${file.path}\n`;
      });
      
      // Add file contents if there are fewer than 5 files
      if (internalSelectedFiles.length <= 5) {
        previewPrompt += '\nFile Contents:\n';
        internalSelectedFiles.forEach(file => {
          previewPrompt += `\n--- ${file.path} ---\n`;
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
                <div className="prompt-editor-tabs" style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className={`prompt-tab-btn ${userPromptTab === 'editor' ? 'active' : ''}`} 
                    style={{ 
                      padding: '6px 12px', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      backgroundColor: userPromptTab === 'editor' ? 'var(--primary-color)' : 'var(--background-secondary)',
                      color: userPromptTab === 'editor' ? 'white' : 'var(--text-color)'
                    }}
                    onClick={() => setUserPromptTab('editor')}
                  >
                    Editor
                  </button>
                  <button 
                    className={`prompt-tab-btn ${userPromptTab === 'preview' ? 'active' : ''}`} 
                    style={{ 
                      padding: '6px 12px', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      backgroundColor: userPromptTab === 'preview' ? 'var(--primary-color)' : 'var(--background-secondary)',
                      color: userPromptTab === 'preview' ? 'white' : 'var(--text-color)'
                    }}
                    onClick={() => {
                      // Generate preview with selected options
                      let previewPrompt = generatePreviewContent();
                      
                      // Combine user prompt with generated content
                      let fullPreview = userPrompt;
                      
                      // Add a separator if there's already content
                      if (fullPreview.trim() !== '' && previewPrompt.trim() !== '') {
                        fullPreview += '\n\n';
                      }
                      
                      // Add the generated content
                      if (previewPrompt.trim() !== '') {
                        fullPreview += previewPrompt;
                      }
                      
                      // Update the preview
                      setPromptPreview(fullPreview);
                      
                      // Switch to preview tab
                      setUserPromptTab('preview');
                    }}
                  >
                    Preview
                  </button>
                </div>
              </div>
              
              {userPromptTab === 'editor' && (
                <textarea
                  ref={editorRef}
                  className="prompt-editor-textarea"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Write your prompt here..."
                  style={{ minHeight: '300px' }}
                />
              )}
              
              {userPromptTab === 'preview' && (
                <div style={{ position: 'relative' }}>
                  <div 
                    className="prompt-preview-area"
                    style={{ 
                      minHeight: '300px',
                      backgroundColor: 'var(--background-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '12px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace'
                    }}
                  >
                    {promptPreview || 'No content to preview.'}
                  </div>
                  
                  <button 
                    className="prompt-action-btn"
                    style={{ 
                      position: 'absolute', 
                      top: '10px', 
                      right: '10px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      backgroundColor: 'var(--background-secondary)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(promptPreview)
                        .then(() => {
                          alert('Preview copied to clipboard!');
                        })
                        .catch(err => {
                          console.error('Error copying to clipboard:', err);
                          alert('Failed to copy to clipboard');
                        });
                    }}
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                </div>
              )}
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
              <h3 style={{ margin: '0 0 12px 0' }}>Include in Prompt</h3>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-language" 
                  checked={promptOptions.includeProgrammingLanguage}
                  onChange={(e) => setPromptOptions({...promptOptions, includeProgrammingLanguage: e.target.checked})}
                />
                <label htmlFor="include-language">Programming Language</label>
              </div>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-framework" 
                  checked={promptOptions.includeFramework}
                  onChange={(e) => setPromptOptions({...promptOptions, includeFramework: e.target.checked})}
                />
                <label htmlFor="include-framework">Framework</label>
              </div>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-tech-stack" 
                  checked={promptOptions.includeTechStack}
                  onChange={(e) => setPromptOptions({...promptOptions, includeTechStack: e.target.checked})}
                />
                <label htmlFor="include-tech-stack">Tech Stack</label>
              </div>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-rules" 
                  checked={promptOptions.includeRules}
                  onChange={(e) => setPromptOptions({...promptOptions, includeRules: e.target.checked})}
                />
                <label htmlFor="include-rules">Project Rules</label>
              </div>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-project-config" 
                  checked={promptOptions.includeProjectConfig}
                  onChange={(e) => setPromptOptions({...promptOptions, includeProjectConfig: e.target.checked})}
                />
                <label htmlFor="include-project-config">Project Configuration</label>
              </div>
              
              <div className="prompt-option-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="include-selected-files" 
                  checked={promptOptions.includeSelectedFiles}
                  onChange={(e) => setPromptOptions({...promptOptions, includeSelectedFiles: e.target.checked})}
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
                  checked={promptOptions.includeProjectPaths}
                  onChange={(e) => setPromptOptions({...promptOptions, includeProjectPaths: e.target.checked})}
                  disabled={internalSelectedFiles.length === 0}
                />
                <label 
                  htmlFor="include-project-paths"
                  style={{ color: internalSelectedFiles.length === 0 ? 'var(--text-muted)' : 'var(--text-color)' }}
                >
                  Project Paths {internalSelectedFiles.length === 0 ? '(none selected)' : `(${internalSelectedFiles.length})`}
                </label>
              </div>
              
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button 
                  className="prompt-action-btn" 
                  style={{ flex: '1' }}
                  onClick={() => {
                    // Generate preview with selected options
                    let previewPrompt = generatePreviewContent();
                    
                    // Combine user prompt with generated content
                    let fullPreview = userPrompt;
                    
                    // Add a separator if there's already content
                    if (fullPreview.trim() !== '' && previewPrompt.trim() !== '') {
                      fullPreview += '\n\n';
                    }
                    
                    // Add the generated content
                    if (previewPrompt.trim() !== '') {
                      fullPreview += previewPrompt;
                    }
                    
                    // Update the preview
                    setPromptPreview(fullPreview);
                    
                    // Switch to preview tab
                    setUserPromptTab('preview');
                  }}
                >
                  Preview
                </button>
                
                <button 
                  className="prompt-action-btn" 
                  style={{ flex: '1' }}
                  onClick={() => {
                    // Generate content with selected options
                    let optionsContent = generatePreviewContent();
                    
                    // Add the options content to the prompt if there's content to add
                    if (optionsContent.trim() !== '') {
                      let generatedPrompt = userPrompt;
                      
                      // Add a separator if there's already content
                      if (generatedPrompt.trim() !== '') {
                        generatedPrompt += '\n\n';
                      }
                      
                      generatedPrompt += optionsContent;
                      setUserPrompt(generatedPrompt);
                    }
                    
                    // Switch back to editor tab
                    setUserPromptTab('editor');
                  }}
                >
                  Add to Prompt
                </button>
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
              onClick={pasteToTextArea}
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