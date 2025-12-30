import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

interface StickerPreviewProps {
  uri: string;
  label?: string;
}

export function StickerPreview({ uri, label }: StickerPreviewProps) {
  return (
    <View style={styles.card}>
      <Image source={{ uri }} style={styles.image} contentFit="contain" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: "#0f1b23",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  image: {
    width: 96,
    height: 96,
  },
  label: {
    color: "#cfdbe4",
    fontSize: 12,
  },
});
