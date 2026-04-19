import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  
  database: {
    url: process.env.DATABASE_URL,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || '7d',
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
    indexName: process.env.PINECONE_INDEX_NAME,
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
};

// Validate required configs
const requiredConfigs = ['jwt.secret', 'openai.apiKey', 'pinecone.apiKey'];
requiredConfigs.forEach(key => {
  const [section, field] = key.split('.');
  if (!config[section as keyof typeof config][field as any]) {
    console.warn(`⚠️ Missing config: ${key}`);
  }
});
