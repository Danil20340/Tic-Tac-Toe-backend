import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updatePlayersAvailability() {
  try {
    const updatedPlayers = await prisma.player.updateMany({
      where: {}, // Обновляем всех игроков
      data: {
        availability: "AVAILABLE",
      },
    });
    
    console.log(`Updated ${updatedPlayers.count} players to AVAILABLE`);
  } catch (error) {
    console.error("Error updating players' availability:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePlayersAvailability();
