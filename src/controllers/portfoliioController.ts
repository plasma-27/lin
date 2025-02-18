import { Request, Response } from "express"
import {createPortfolioSchema, updatePortfolioSchema} from "../types/types"
import { prismaClient } from "../index"; 
import { nanoid } from "nanoid";


export const createPortfolio = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).userId; 
  
      const parsedData = createPortfolioSchema.parse(req.body);
  
      const portfolio = await prismaClient.portfolio.create({
        data: {
          name: parsedData.portName,
          description: parsedData.description,
          avatar: parsedData.avatar,
          userId: userId,
        },
      });
  
      if (parsedData.links && parsedData.links.length > 0) {
        const portfolioLinks = parsedData.links.map((link) => ({
          name: link.name,
          originalUrl: link.link,
          shortUrl: nanoid(6),
          portfolioId: portfolio.id,
        }));
  
        // Bulk create portfolio links
        await prismaClient.portfolioLink.createMany({
          data: portfolioLinks,
        });
      }
  
      res.status(201).json({
        message: "Portfolio created successfully",
        portfolioId: portfolio.id,
      });
    } catch (error) {
      console.error("Error creating portfolio:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "An unknown error occurred" });
    }
  };

export const deletePortfolio = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const portfolioId = +req.params.id;

    // Check if portfolio exists and belongs to user
    const portfolio = await prismaClient.portfolio.findFirst({
      where: {
        id: portfolioId,
        userId: userId
      }
    });

    if (!portfolio) {
      res.status(404).json({ error: "Portfolio not found or unauthorized" });
      return;
    }

    // Delete portfolio and associated links (cascade delete will handle links)
    await prismaClient.portfolio.delete({
      where: {
        id: portfolioId
      }
    });

    res.status(200).json({ message: "Portfolio deleted successfully" });
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    res.status(400).json({ error: error instanceof Error ? error.message : "An unknown error occurred" });
  }
};

export const updatePortfolio = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const portfolioId = +req.params.id;

    const parsedData = updatePortfolioSchema.parse(req.body);

    // Check if portfolio exists and belongs to user
    const portfolio = await prismaClient.portfolio.findFirst({
      where: {
        id: portfolioId,
        userId: userId
      }
    });

    if (!portfolio) {
      res.status(404).json({ error: "Portfolio not found or unauthorized" });
      return;
    }

    // Update portfolio basic info
    const updatedPortfolio = await prismaClient.portfolio.update({
      where: {
        id: portfolioId
      },
      data: {
        name: parsedData.portName,
        description: parsedData.description
      }
    });

    // If links are provided, update them
    if (parsedData.links && parsedData.links.length > 0) {
      // Delete existing links
      await prismaClient.portfolioLink.deleteMany({
        where: {
          portfolioId: portfolioId
        }
      });

      // Create new links
      const portfolioLinks = parsedData.links.map((link) => ({
        name: link.name,
        originalUrl: link.link,
        shortUrl: nanoid(6),
        portfolioId: portfolioId
      }));

      await prismaClient.portfolioLink.createMany({
        data: portfolioLinks
      });
    }

    res.status(200).json({
      message: "Portfolio updated successfully",
      portfolio: updatedPortfolio
    });
  } catch (error) {
    console.error("Error updating portfolio:", error);
    res.status(400).json({ error: error instanceof Error ? error.message : "An unknown error occurred" });
  }
};

