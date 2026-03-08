import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, ScrollView, Alert } from 'react-native';

export default function App() {
  const [pain, setPain] = useState('');
  const [energy, setEnergy] = useState('');
  const [mood, setMood] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState([]);

  const saveEntry = () => {
    const newEntry = {
      date: new Date().toLocaleDateString(),
      pain,
      energy,
      mood,
      notes
    };
    
    setEntries([...entries, newEntry]);
    Alert.alert('Success', 'Entry saved! 💜');
    
    // Clear form
    setPain('');
    setEnergy('');
    setMood('');
    setNotes('');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🌸 Endo Companion</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Pain Level (0-4)</Text>
        <TextInput
          style={styles.input}
          value={pain}
          onChangeText={setPain}
          placeholder="0-4"
          keyboardType="numeric"
        />
        
        <Text style={styles.label}>Energy Level (0-4)</Text>
        <TextInput
          style={styles.input}
          value={energy}
          onChangeText={setEnergy}
          placeholder="0-4"
          keyboardType="numeric"
        />
        
        <Text style={styles.label}>Mood</Text>
        <TextInput
          style={styles.input}
          value={mood}
          onChangeText={setMood}
          placeholder="How are you feeling?"
        />
        
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional notes..."
          multiline
        />
        
        <Button title="💾 Save Entry" onPress={saveEntry} />
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Entries ({entries.length})</Text>
        {entries.slice(-3).reverse().map((entry, index) => (
          <View key={index} style={styles.entry}>
            <Text style={styles.entryDate}>{entry.date}</Text>
            <Text>Pain: {entry.pain}/4 | Energy: {entry.energy}/4</Text>
            <Text>Mood: {entry.mood}</Text>
            {entry.notes ? <Text>Notes: {entry.notes}</Text> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#e91e63',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  entry: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  entryDate: {
    fontWeight: 'bold',
    color: '#e91e63',
  },
});
