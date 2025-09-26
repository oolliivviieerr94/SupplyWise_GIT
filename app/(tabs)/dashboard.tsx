// /home/project/app/(tabs)/dashboard.tsx
// (identique à ma version précédente, à un détail près : l’ordre des sections ci-dessous)
…[le même import & code que ta dernière version envoyée par moi]…

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadCore} tintColor="#22C55E" />
      }
    >
      {/* En-tête */}
      … (header identique) …

      {/* —— 1) Conseil du jour EN PREMIER —— */}
      <View style={styles.section}>
        … (bloc Conseil identique) …
      </View>

      {/* —— 2) Votre profil —— */}
      <View style={styles.section}>
        … (bloc Profil identique) …
      </View>

      {/* —— 3) Actions rapides —— */}
      <View style={styles.section}>
        … (bloc Actions rapides identique) …
      </View>

      {/* Statistiques */}
      … (bloc Stats identique) …

      <View style={styles.footer} />
    </ScrollView>
  );
}

…(styles inchangés)…
