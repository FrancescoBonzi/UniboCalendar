import { jest } from '@jest/globals';

// Mock fs module before importing anything else
const mockFs = {
    createReadStream: jest.fn(),
    writeFile: jest.fn(),
    statSync: jest.fn(),
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
        access: jest.fn(),
        mkdir: jest.fn()
    }
};

jest.unstable_mockModule('fs', () => mockFs);

// Mock csv-parser
const mockCsv = jest.fn();
jest.unstable_mockModule('csv-parser', () => ({
    default: mockCsv
}));

// Import the function to test after mocking
const { getAreas } = await import('../src/model.js');

describe('getAreas', () => {
    let mockReadStream;
    let mockPipe;
    let mockOn;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Create mock functions
        mockOn = jest.fn();
        mockPipe = jest.fn().mockReturnValue({ on: mockOn });
        mockReadStream = {
            pipe: mockPipe
        };
        
        // Mock fs.createReadStream
        mockFs.createReadStream.mockReturnValue(mockReadStream);
        
        // Mock csv parser
        mockPipe.mockReturnValue({ on: mockOn });
    });

    test('should return unique sorted areas from CSV file', async () => {
        // Mock CSV data
        const mockCsvData = [
            { ambiti: 'Scienze' },
            { ambiti: 'Economia e management' },
            { ambiti: 'Ingegneria e architettura' },
            { ambiti: 'Scienze' }, // Duplicate to test uniqueness
            { ambiti: 'Economia e management' }, // Duplicate
            { ambiti: 'Medicina' },
            { ambiti: '' }, // Empty ambiti should be filtered out
            { ambiti: 'Lettere e filosofia' }
        ];

        // Set up the mock to simulate CSV parsing
        mockOn.mockImplementation((event, callback) => {
            if (event === 'data') {
                // Simulate data events
                mockCsvData.forEach(data => callback(data));
            } else if (event === 'end') {
                // Simulate end event
                callback();
            }
            return { on: mockOn }; // Chainable
        });

        const result = await getAreas();

        // Verify fs.createReadStream was called with correct file path
        expect(mockFs.createReadStream).toHaveBeenCalledWith('./opendata/corsi.csv');
        
        // Verify the result contains unique, sorted areas
        const expectedAreas = ['Economia e management', 'Ingegneria e architettura', 'Lettere e filosofia', 'Medicina', 'Scienze'];
        expect(result).toEqual(expectedAreas);
    });

    test('should handle file read error', async () => {
        const error = new Error('File not found');
        mockFs.createReadStream.mockImplementation(() => {
            throw error;
        });

        await expect(getAreas()).rejects.toThrow('File not found');
    });

    test('should handle CSV parsing error', async () => {
        mockOn.mockImplementation((event, callback) => {
            if (event === 'data') {
                // Simulate CSV parsing error
                callback({ ambiti: 'Scienze' });
                throw new Error('CSV parsing error');
            }
            return { on: mockOn };
        });

        await expect(getAreas()).rejects.toThrow('CSV parsing error');
    });

    test('should return areas in alphabetical order', async () => {
        const mockCsvData = [
            { ambiti: 'Zebra' },
            { ambiti: 'Apple' },
            { ambiti: 'Banana' },
            { ambiti: 'Cherry' }
        ];

        mockOn.mockImplementation((event, callback) => {
            if (event === 'data') {
                mockCsvData.forEach(data => callback(data));
            } else if (event === 'end') {
                callback();
            }
            return { on: mockOn };
        });

        const result = await getAreas();

        expect(result).toEqual(['Apple', 'Banana', 'Cherry', 'Zebra']);
    });

});
