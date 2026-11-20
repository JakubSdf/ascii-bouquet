export type FlowerId = "rose" | "daisy" | "tulip" | "sunflower" | "lavender" | "lily" | "babysbreath";
export type WrapId = "pink" | "red" | "lilac" | "gold" | "sage" | "white";
export type OccasionId = "love" | "birthday" | "sorry" | "thanks" | "justbecause";

export interface FlowerPick {
  id: FlowerId;
  count: number;
}

export interface BouquetConfig {
  flowers: FlowerPick[];
  wrap: WrapId;
  occasion: OccasionId;
  to: string;
  from: string;
  message: string;
}

export interface FlowerSpec {
  name: string;
  meaning: string;
  glyph: string;
  code: string;
  kind: "disc" | "tulip" | "lily" | "spike" | "cloud";
  petals: number;
  palette: string[];
  center: string[];
}

export interface WrapSpec {
  label: string;
  swatch: string;
  paper: string[];
  ribbon: string[];
}

export interface OccasionSpec {
  label: string;
  icon: string;
  defaultMessage: string;
}
