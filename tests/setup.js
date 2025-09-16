/**
 * Jest Setup File
 * Configure test environment and global mocks
 */

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    body: {
      getReader: () => ({
        read: () => Promise.resolve({ done: true, value: null })
      })
    }
  })
);

// Mock marked (markdown parser)
global.marked = {
  parse: jest.fn((content) => content),
  setOptions: jest.fn()
};

// Mock DOMPurify
global.DOMPurify = {
  sanitize: jest.fn((content) => content)
};

// Mock Prism (syntax highlighter)
global.Prism = {
  highlight: jest.fn((code) => code),
  languages: {
    javascript: {},
    python: {},
    html: {},
    css: {}
  }
};

// Mock clipboard API
global.navigator.clipboard = {
  writeText: jest.fn(() => Promise.resolve()),
  readText: jest.fn(() => Promise.resolve(''))
};

// Mock AbortController
global.AbortController = class {
  constructor() {
    this.signal = { aborted: false };
  }
  abort() {
    this.signal.aborted = true;
  }
};

// Mock window.electronAPI for desktop features
global.window.electronAPI = undefined; // Set to undefined by default, tests can override

// Add custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// Suppress console errors in tests (optional)
if (process.env.SUPPRESS_CONSOLE) {
  global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
  };
}