import React, { useState, useEffect } from 'react';
import '../styles/ProjectConfig.css';

const ProjectConfig = () => {
  const [config, setConfig] = useState({
    projectType: 'typescript',
    buildCommand: 'npm run build',
    devCommand: 'npm run dev',
    outputDir: 'dist',
    framework: 'none',
    nodeVersion: '18.x',
    packageManager: 'npm',
    testing: 'none',
    linter: 'none',
    formatter: 'none',
    typescript: false,
    cssFramework: 'none',
    stateManagement: 'none',
    customFramework: '',
    customTesting: '',
    customLinter: '',
    customFormatter: '',
    customStateManagement: '',
  });

  const [saveStatus, setSaveStatus] = useState({ message: '', type: '' });

  // Define build commands for each project type
  const buildCommands = {
    typescript: { build: 'npm run build', dev: 'npm run dev', output: 'dist' },
    javascript: { build: 'npm run build', dev: 'npm run dev', output: 'dist' },
    python: { build: 'python setup.py build', dev: 'python main.py', output: 'build' },
    java: { build: 'mvn package', dev: 'mvn spring-boot:run', output: 'target' },
    go: { build: 'go build', dev: 'go run .', output: 'bin' },
    rust: { build: 'cargo build', dev: 'cargo run', output: 'target/debug' },
  };

  // Define linters for each project type
  const linters = {
    typescript: [
      { id: 'none', name: 'None' },
      { id: 'eslint', name: 'ESLint' },
      { id: 'other', name: 'Other' }
    ],
    javascript: [
      { id: 'none', name: 'None' },
      { id: 'eslint', name: 'ESLint' },
      { id: 'other', name: 'Other' }
    ],
    python: [
      { id: 'none', name: 'None' },
      { id: 'pylint', name: 'Pylint' },
      { id: 'flake8', name: 'Flake8' },
      { id: 'other', name: 'Other' }
    ],
    java: [
      { id: 'none', name: 'None' },
      { id: 'checkstyle', name: 'Checkstyle' },
      { id: 'pmd', name: 'PMD' },
      { id: 'other', name: 'Other' }
    ],
    go: [
      { id: 'none', name: 'None' },
      { id: 'golangci-lint', name: 'GolangCI-Lint' },
      { id: 'other', name: 'Other' }
    ],
    rust: [
      { id: 'none', name: 'None' },
      { id: 'clippy', name: 'Clippy' },
      { id: 'other', name: 'Other' }
    ],
  };

  // Define formatters for each project type
  const formatters = {
    typescript: [
      { id: 'none', name: 'None' },
      { id: 'prettier', name: 'Prettier' },
      { id: 'other', name: 'Other' }
    ],
    javascript: [
      { id: 'none', name: 'None' },
      { id: 'prettier', name: 'Prettier' },
      { id: 'other', name: 'Other' }
    ],
    python: [
      { id: 'none', name: 'None' },
      { id: 'black', name: 'Black' },
      { id: 'yapf', name: 'YAPF' },
      { id: 'other', name: 'Other' }
    ],
    java: [
      { id: 'none', name: 'None' },
      { id: 'google-java-format', name: 'Google Java Format' },
      { id: 'other', name: 'Other' }
    ],
    go: [
      { id: 'none', name: 'None' },
      { id: 'gofmt', name: 'gofmt' },
      { id: 'other', name: 'Other' }
    ],
    rust: [
      { id: 'none', name: 'None' },
      { id: 'rustfmt', name: 'rustfmt' },
      { id: 'other', name: 'Other' }
    ],
  };

  const frameworks = {
    typescript: [
      { id: 'none', name: 'None' },
      { id: 'react', name: 'React' },
      { id: 'vue', name: 'Vue' },
      { id: 'angular', name: 'Angular' },
      { id: 'next', name: 'Next.js' },
      { id: 'nest', name: 'NestJS' },
      { id: 'express', name: 'Express' },
      { id: 'fastify', name: 'Fastify' },
      { id: 'koa', name: 'Koa' },
      { id: 'other', name: 'Other' }
    ],
    javascript: [
      { id: 'none', name: 'None' },
      { id: 'react', name: 'React' },
      { id: 'vue', name: 'Vue' },
      { id: 'svelte', name: 'Svelte' },
      { id: 'express', name: 'Express' },
      { id: 'fastify', name: 'Fastify' },
      { id: 'koa', name: 'Koa' },
      { id: 'other', name: 'Other' }
    ],
    python: [
      { id: 'none', name: 'None' },
      { id: 'django', name: 'Django' },
      { id: 'flask', name: 'Flask' },
      { id: 'fastapi', name: 'FastAPI' },
      { id: 'other', name: 'Other' }
    ],
    java: [
      { id: 'none', name: 'None' },
      { id: 'spring-boot', name: 'Spring Boot' },
      { id: 'quarkus', name: 'Quarkus' },
      { id: 'other', name: 'Other' }
    ],
    go: [
      { id: 'none', name: 'None' },
      { id: 'gin', name: 'Gin' },
      { id: 'echo', name: 'Echo' },
      { id: 'other', name: 'Other' }
    ],
    rust: [
      { id: 'none', name: 'None' },
      { id: 'actix', name: 'Actix' },
      { id: 'rocket', name: 'Rocket' },
      { id: 'other', name: 'Other' }
    ],
  };

  const projectTypes = [
    { id: 'typescript', name: 'TypeScript' },
    { id: 'javascript', name: 'JavaScript' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'go', name: 'Go' },
    { id: 'rust', name: 'Rust' },
  ];

  const nodeVersions = ['20.x', '18.x', '16.x', '14.x'];
  
  const packageManagers = [
    { id: 'npm', name: 'npm' },
    { id: 'yarn', name: 'Yarn' },
    { id: 'pnpm', name: 'pnpm' },
    { id: 'bun', name: 'Bun' },
  ];

  const testingFrameworks = {
    typescript: [
      { id: 'none', name: 'None' },
      { id: 'jest', name: 'Jest' },
      { id: 'vitest', name: 'Vitest' },
      { id: 'cypress', name: 'Cypress' },
      { id: 'playwright', name: 'Playwright' },
      { id: 'other', name: 'Other' }
    ],
    javascript: [
      { id: 'none', name: 'None' },
      { id: 'jest', name: 'Jest' },
      { id: 'vitest', name: 'Vitest' },
      { id: 'cypress', name: 'Cypress' },
      { id: 'playwright', name: 'Playwright' },
      { id: 'other', name: 'Other' }
    ],
    python: [
      { id: 'none', name: 'None' },
      { id: 'pytest', name: 'pytest' },
      { id: 'unittest', name: 'unittest' },
      { id: 'other', name: 'Other' }
    ],
    java: [
      { id: 'none', name: 'None' },
      { id: 'junit', name: 'JUnit' },
      { id: 'testng', name: 'TestNG' },
      { id: 'other', name: 'Other' }
    ],
  };

  const cssFrameworks = [
    { id: 'none', name: 'None' },
    { id: 'tailwind', name: 'Tailwind CSS' },
    { id: 'bootstrap', name: 'Bootstrap' },
    { id: 'mui', name: 'Material-UI' },
    { id: 'chakra', name: 'Chakra UI' },
    { id: 'sass', name: 'SASS/SCSS' },
  ];

  const stateManagement = {
    react: [
      { id: 'none', name: 'None' },
      { id: 'redux', name: 'Redux' },
      { id: 'recoil', name: 'Recoil' },
      { id: 'zustand', name: 'Zustand' },
      { id: 'jotai', name: 'Jotai' },
      { id: 'other', name: 'Other' }
    ],
    vue: [
      { id: 'none', name: 'None' },
      { id: 'vuex', name: 'Vuex' },
      { id: 'pinia', name: 'Pinia' },
      { id: 'other', name: 'Other' }
    ],
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log(`Config change: ${name} = ${type === 'checkbox' ? checked : value}`);
    
    setConfig(prev => {
      const newConfig = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Update build settings when project type changes
      if (name === 'projectType') {
        const buildSettings = buildCommands[value];
        newConfig.buildCommand = buildSettings.build;
        newConfig.devCommand = buildSettings.dev;
        newConfig.outputDir = buildSettings.output;
        
        // Reset framework and custom values
        newConfig.framework = 'none';
        newConfig.customFramework = '';
        newConfig.testing = 'none';
        newConfig.customTesting = '';
        newConfig.linter = 'none';
        newConfig.customLinter = '';
        newConfig.formatter = 'none';
        newConfig.customFormatter = '';
        newConfig.stateManagement = 'none';
        newConfig.customStateManagement = '';
        newConfig.cssFramework = 'none';

        // Reset TypeScript option
        newConfig.typescript = value === 'typescript';
      }

      // Update when framework changes
      if (name === 'framework') {
        // Reset state management and CSS framework when framework changes
        if (!['react', 'vue'].includes(value)) {
          newConfig.stateManagement = 'none';
          newConfig.customStateManagement = '';
        }
        
        if (!['react', 'vue', 'svelte', 'angular'].includes(value)) {
          newConfig.cssFramework = 'none';
        }

        // Clear custom framework if not 'other'
        if (value !== 'other') {
          newConfig.customFramework = '';
        }
      }

      // Clear custom values when switching away from 'other'
      if (name === 'testing' && value !== 'other') newConfig.customTesting = '';
      if (name === 'linter' && value !== 'other') newConfig.customLinter = '';
      if (name === 'formatter' && value !== 'other') newConfig.customFormatter = '';
      if (name === 'stateManagement' && value !== 'other') newConfig.customStateManagement = '';

      // Auto-save the configuration immediately for language changes
      if (name === 'projectType' || name === 'typescript') {
        console.log('Auto-saving language change:', newConfig);
        localStorage.setItem('project-config', JSON.stringify(newConfig));
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('project-config-updated', { 
          detail: { config: newConfig }
        }));
      } else {
        // For other changes, use the existing auto-save with timeout
        setTimeout(() => {
          localStorage.setItem('project-config', JSON.stringify(newConfig));
          
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent('project-config-updated', { 
            detail: { config: newConfig }
          }));
        }, 0);
      }

      return newConfig;
    });
  };

  const handleSubmit = async () => {
    setSaveStatus({ message: 'Saving...', type: 'info' });

    try {
      // Save to localStorage
      localStorage.setItem('project-config', JSON.stringify(config));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('project-config-updated', { 
        detail: { config }
      }));

      // Create project configuration
      const projectConfig = {
        ...config,
        framework: config.framework === 'other' ? config.customFramework : config.framework,
        testing: config.testing === 'other' ? config.customTesting : config.testing,
        linter: config.linter === 'other' ? config.customLinter : config.linter,
        formatter: config.formatter === 'other' ? config.customFormatter : config.formatter,
        stateManagement: config.stateManagement === 'other' ? config.customStateManagement : config.stateManagement,
      };

      // TODO: Add API call here to create project with configuration
      // For now, we'll simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSaveStatus({ message: 'Saved', type: 'success' });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus({ message: '', type: '' });
      }, 3000);
    } catch (error) {
      console.error('Error saving configuration:', error);
      setSaveStatus({ message: 'Error saving. Please try again.', type: 'error' });
    }
  };

  useEffect(() => {
    const savedConfig = localStorage.getItem('project-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  return (
    <div className="project-config">
      <div className="project-config-header">
        <h2>Project Configuration</h2>
        {saveStatus.message && (
          <div className={`save-status ${saveStatus.type}`}>
            {saveStatus.message}
          </div>
        )}
      </div>
      <form>
        <div className="config-sections">
          <div className="config-section">
            <h3>Basic Configuration</h3>
            <label>
              Project Type
              <select name="projectType" value={config.projectType} onChange={handleChange}>
                {projectTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </label>

            <label>
              Framework
              <select name="framework" value={config.framework} onChange={handleChange}>
                {(frameworks[config.projectType] || []).map(fw => (
                  <option key={fw.id} value={fw.id}>{fw.name}</option>
                ))}
              </select>
            </label>
            {config.framework === 'other' && (
              <label>
                Custom Framework
                <input
                  type="text"
                  name="customFramework"
                  value={config.customFramework}
                  onChange={handleChange}
                  placeholder="Enter framework name"
                />
              </label>
            )}

            {['typescript', 'javascript'].includes(config.projectType) && (
              <>
                <label>
                  Package Manager
                  <select name="packageManager" value={config.packageManager} onChange={handleChange}>
                    {packageManagers.map(pm => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Node.js Version
                  <select name="nodeVersion" value={config.nodeVersion} onChange={handleChange}>
                    {nodeVersions.map(version => (
                      <option key={version} value={version}>{version}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>

          <div className="config-section">
            <h3>Build Settings</h3>
            <label>
              Build Command
              <input
                type="text"
                name="buildCommand"
                value={config.buildCommand}
                onChange={handleChange}
                placeholder={buildCommands[config.projectType].build}
              />
            </label>

            <label>
              Development Command
              <input
                type="text"
                name="devCommand"
                value={config.devCommand}
                onChange={handleChange}
                placeholder={buildCommands[config.projectType].dev}
              />
            </label>

            <label>
              Output Directory
              <input
                type="text"
                name="outputDir"
                value={config.outputDir}
                onChange={handleChange}
                placeholder={buildCommands[config.projectType].output}
              />
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProjectConfig; 