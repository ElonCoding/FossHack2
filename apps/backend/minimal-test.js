const { MongoClient } = require('mongodb');

const url = 'mongodb+srv://Fosshack:hack123@cluster0.scelpyr.mongodb.net/?appName=Cluster0';

async function test() {
  const client = new MongoClient(url);
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('Connected successfully!');
    const db = client.db('openevent');
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
  } catch (err) {
    console.error('Connection failed:', err);
  } finally {
    await client.close();
  }
}

test();
