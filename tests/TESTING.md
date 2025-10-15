# Testing

This project uses Jest for unit testing.

## Running Tests

```bash
npm test
```

## Test Structure

Tests are located in the `tests/` directory with the `.test.js` extension.

## Current Tests

- `model.test.js` - Tests for the `getAreas()` function in `model.js`

## Test Coverage

The `getAreas()` function is thoroughly tested with the following scenarios:

1. **Normal operation**: Returns unique, sorted areas from CSV data
2. **Empty value filtering**: Filters out empty `ambiti` values
3. **No valid data**: Returns empty array when no valid areas found
4. **Single area**: Handles single area correctly
5. **Error handling**: Handles file read errors and CSV parsing errors
6. **Sorting**: Returns areas in alphabetical order
7. **Special characters**: Handles special characters in area names

## Mocking

Tests use Jest's mocking capabilities to:
- Mock the `fs` module to avoid actual file system operations
- Mock CSV parsing to control test data
- Simulate various error conditions
