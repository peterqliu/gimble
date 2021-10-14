const config = {
    "transform": {},
    "verbose": true,
    "setupFilesAfterEnv": [
      "./__tests__/fixtures/jest.setup.js"
    ],

    // use dummy shader code so jest doesn't trip up on glsl syntax
    "moduleNameMapper": {
      "glsl$":"<rootDir>/__tests__/fixtures/shaders.js"
    }
}

export default config