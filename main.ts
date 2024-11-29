import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { MongoClient, ObjectId } from "mongodb";
import "https://deno.land/x/dotenv/load.ts";

// Configuración de MongoDB
const MONGO_URL = Deno.env.get("MONGO_URL");
if (!MONGO_URL) {
  console.error("El link de MongoDB no está definido en las variables de entorno.");
  Deno.exit(1);
}

const client = new MongoClient(MONGO_URL);
await client.connect();
console.log("Conectado a MongoDB");

const db = client.db("aerolinea");
const vuelosCollection = db.collection("vuelos");

// Definición del esquema GraphQL
const typeDefs = `#graphql
  type Vuelo {
    id: ID!
    origen: String!
    destino: String!
    fechaHora: String!
  }

  type Query {
    getFlights(origen: String, destino: String): [Vuelo!]!
    getFlight(id: ID!): Vuelo
  }

  type Mutation {
    addFlight(origen: String!, destino: String!, fechaHora: String!): Vuelo!
  }
`;

// Resolvers de la API GraphQL
const resolvers = {
  Query: {
    getFlights: async (_: unknown, args: { origen?: string; destino?: string }) => {
      const query: Record<string, string> = {};
      if (args.origen) query.origen = args.origen;
      if (args.destino) query.destino = args.destino;

      const vuelos = await vuelosCollection.find(query).toArray();
      return vuelos.map((vuelo) => ({
        id: vuelo._id.toString(),
        ...vuelo,
      }));
    },
    getFlight: async (_: unknown, args: { id: string }) => {
      const vuelo = await vuelosCollection.findOne({ _id: new ObjectId(args.id) });
      if (!vuelo) return null;

      return {
        id: vuelo._id.toString(),
        ...vuelo,
      };
    },
  },
  Mutation: {
    addFlight: async (_: unknown, args: { origen: string; destino: string; fechaHora: string }) => {
      const newFlight = {
        origen: args.origen,
        destino: args.destino,
        fechaHora: args.fechaHora,
      };

      const result = await vuelosCollection.insertOne(newFlight);
      return {
        id: result.insertedId.toString(),
        ...newFlight,
      };
    },
  },
};

// Configuración del servidor Apollo
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀 Servidor listo en: ${url}`);
