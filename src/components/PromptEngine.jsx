import React, { useState, useEffect, useRef } from 'react';
import { Save, Copy, Play, Plus, Settings, Edit, Tag, Bookmark, X } from 'lucide-react';

// Template prompt data
const templatePrompts = [
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
    template: 'I need to implement {{feature_name}} in my {{project_type}} project. The tech stack includes {{tech_stack}}. Here are the requirements:\n\n{{requirements}}\n\nPlease provide a step-by-step guide and code examples to implement this feature.',
    variables: [
      { name: 'feature_name', description: 'Name of the feature', default: 'user authentication' },
      { name: 'project_type', description: 'Type of project', default: 'web application' },
      { name: 'tech_stack', description: 'Technologies used', default: 'React, Node.js, MongoDB' },
      { name: 'requirements', description: 'Feature requirements', default: '- User login with email/password\n- Social login options\n- Password reset functionality' }
    ],
    tags: ['implementation', 'feature', 'guide']
  },
  {
    id: 'template-3',
    title: 'Bug Diagnosis',
    description: 'Get help diagnosing and fixing a bug.',
    template: 'I\'m experiencing a bug in my {{language}} application. Here are the details:\n\n**Expected behavior**: {{expected}}\n\n**Actual behavior**: {{actual}}\n\n**Error message**: {{error}}\n\n**Code snippet**:\n```{{language}}\n{{code}}\n```\n\nHow can I diagnose and fix this issue?',
    variables: [
      { name: 'language', description: 'Programming language', default: 'javascript' },
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
    template: 'I need to optimize the following {{language}} code for {{optimization_goal}}:\n\n```{{language}}\n{{code}}\n```\n\nCurrent performance: {{current_performance}}\n\nTarget performance: {{target_performance}}\n\nPlease suggest optimization strategies and provide optimized code examples.',
    variables: [
      { name: 'language', description: 'Programming language', default: 'javascript' },
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
    template: 'I\'m designing the architecture for a {{project_type}} with the following requirements:\n\n{{requirements}}\n\nThe tech stack includes {{tech_stack}}.\n\nPlease suggest an appropriate architecture design, including component structure, data flow, and any design patterns that would be beneficial.',
    variables: [
      { name: 'project_type', description: 'Type of project', default: 'web application' },
      { name: 'requirements', description: 'Project requirements', default: '- High scalability (millions of users)\n- Real-time updates\n- Data persistence\n- Authentication and authorization' },
      { name: 'tech_stack', description: 'Technologies to use', default: 'React, Node.js, PostgreSQL, Redis' }
    ],
    tags: ['architecture', 'design', 'system']
  },
  {
    id: 'template-6',
    title: 'Documentation',
    description: 'Get help creating documentation for your code.',
    template: 'Please help me create documentation for the following {{language}} code:\n\n```{{language}}\n{{code}}\n```\n\nThe documentation should include:\n- {{doc_type}}\n- {{inclusion}}\n\nTarget audience: {{audience}}',
    variables: [
      { name: 'language', description: 'Programming language', default: 'javascript' },
      { name: 'code', description: 'Code to document', default: '// Paste your code here' },
      { name: 'doc_type', description: 'Type of documentation', default: 'Function descriptions, parameter details, and return values' },
      { name: 'inclusion', description: 'What to include', default: 'Usage examples and edge cases' },
      { name: 'audience', description: 'Documentation audience', default: 'Junior developers who will maintain this code' }
    ],
    tags: ['documentation', 'docs', 'comments']
  }
];

const PromptEngine = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [variables, setVariables] = useState({});
  const [finalPrompt, setFinalPrompt] = useState('');
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
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
  }, []);
  
  // Handle template selection
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    
    // Initialize variables from template
    const initialVariables = {};
    template.variables.forEach(variable => {
      initialVariables[variable.name] = variable.default || '';
    });
    
    setVariables(initialVariables);
    updateFinalPrompt(template.template, initialVariables);
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
    let result = template;
    
    // Replace all variables in the format {{variable_name}}
    Object.keys(vars).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, vars[key]);
    });
    
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
    navigator.clipboard.writeText(finalPrompt || customPrompt)
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
    
    // Simulate sending to an AI service
    setTimeout(() => {
      setLoading(false);
      alert('Prompt applied! This would send the prompt to the AI service in a real implementation.');
    }, 1000);
  };
  
  return (
    <div className="prompt-container">
      <div className="prompt-header">
        <h1 className="prompt-title">Prompt Engineering</h1>
      </div>
      
      <div className="prompt-tabs">
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
      
      {activeTab === 'templates' && (
        <>
          <div className="prompt-templates">
            {templatePrompts.map(template => (
              <div 
                key={template.id}
                className={`prompt-template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                onClick={() => handleTemplateSelect(template)}
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
                      onClick={() => {
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
                      onClick={() => {
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