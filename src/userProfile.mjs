import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export async function loadProfile(userId) {
  const resp = await ddb.send(new GetCommand({
    TableName: process.env.PROFILES_TABLE,
    Key: { userId },
  }));
  return resp.Item ?? null;
}

export async function saveProfile(userId, { nombre, edad, sexo, ubicacion }) {
  await ddb.send(new PutCommand({
    TableName: process.env.PROFILES_TABLE,
    Item: {
      userId,
      nombre,
      edad,
      sexo,
      ubicacion,
      updatedAt: Date.now(),
    },
  }));
}
