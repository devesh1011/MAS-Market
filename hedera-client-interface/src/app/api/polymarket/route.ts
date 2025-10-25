import { NextResponse } from 'next/server';

interface Event {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  active: boolean;
  closed: boolean;
  endDate: string;
  volume: number;
  tags: Array<{ label: string; slug: string }>;
}

interface Series {
  id: string;
  active: boolean;
  events: Event[];
}

export async function GET() {
  try {
    // Fetch from Gamma API /series endpoint
    const response = await fetch('https://gamma-api.polymarket.com/series?active=true', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Polymarket Gamma API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract all active, future-dated events
    const now = new Date();
    const allEvents: Array<Event & { assetId: string }> = [];

    (data as Series[]).forEach((series: Series) => {
      if (series.active && series.events) {
        series.events.forEach((event: Event) => {
          const endDate = new Date(event.endDate);
          // Only include active events that end in the future and aren't closed
          if (event.active && !event.closed && endDate > now) {
            allEvents.push({
              ...event,
              assetId: event.id, // Use event ID as asset ID
            });
          }
        });
      }
    });

    // Sort by volume (highest first)
    allEvents.sort((a, b) => (b.volume || 0) - (a.volume || 0));

    return NextResponse.json({
      events: allEvents,
      assetIds: allEvents.map((e) => e.assetId),
      count: allEvents.length,
    });
  } catch (error) {
    console.error('Error fetching from Polymarket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets from Polymarket', details: String(error) },
      { status: 500 },
    );
  }
}
