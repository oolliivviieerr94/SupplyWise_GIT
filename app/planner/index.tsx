import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Platform, TouchableOpacity, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import BigCalendar, { Event as CalEvent } from 'react-native-big-calendar';
import { fetchWeekEvents, markTaken, snoozeEvent } from '@/src/lib/planning/persist';
import { ArrowLeft } from 'lucide-react-native';

const THEME = { green:'#18c15a', bg:'#0f1115', text:'#e9f0ec' };
type DBEvent = { id:string; supplement_id:string; ts_planned:string; status:string; };

export default function PlannerWeek() {
  const [events, setEvents] = useState<DBEvent[]>([]);
  const [weekStart, setWeekStart] = useState(dayjs().startOf('week'));

  async function load() {
    const from = weekStart.toISOString();
    const to = weekStart.add(7,'day').toISOString();
    const { data } = await fetchWeekEvents(from, to);
    setEvents(data ?? []);
  }
  useEffect(() => { load(); }, [weekStart]);

  const calEvents: CalEvent[] = useMemo(() =>
    events.map(e => ({
      id: e.id,
      title: (e.status==='taken'?'✅ ':'') + `Supp ${e.supplement_id.slice(0,4)}…`,
      start: new Date(e.ts_planned),
      end: new Date(new Date(e.ts_planned).getTime() + 30*60000),
      color: e.status==='taken' ? '#5ad06f' : THEME.green
    })), [events]);

  async function onEventPress(evt: CalEvent) {
    const found = events.find(x => x.id === String(evt.id));
    if (!found) return;
    if (found.status !== 'taken') await markTaken(found.id);
    else await snoozeEvent(found.id, 15);
    load();
  }

  return (
    <View style={{flex:1, backgroundColor:THEME.bg, paddingTop:8}}>
      <View style={{paddingTop:52, paddingHorizontal:16, paddingBottom:8}}>
        <TouchableOpacity 
          style={{
            flexDirection:'row', 
            alignItems:'center', 
            backgroundColor:'rgba(255,255,255,0.1)', 
            paddingHorizontal:12, 
            paddingVertical:8, 
            borderRadius:20,
            alignSelf:'flex-start'
          }}
          onPress={() => router.back()}>
          <ArrowLeft size={20} color={THEME.text} />
          <Text style={{color:THEME.text, marginLeft:8, fontWeight:'600'}}>Retour</Text>
        </TouchableOpacity>
      </View>
      <Header weekStart={weekStart} onPrev={()=>setWeekStart(weekStart.add(-7,'day'))} onNext={()=>setWeekStart(weekStart.add(7,'day'))}/>
      {Platform.OS !== 'web' ? (
        <BigCalendar mode="week" events={calEvents} height={680} onPressEvent={onEventPress} weekStartsOn={1} />
      ) : (
        <ScrollView style={{flex:1, padding:16}}>
          <Text style={{color:THEME.text, fontSize:18, fontWeight:'700', marginBottom:16, textAlign:'center'}}>
            Planning de la semaine
          </Text>
          
          {calEvents.length === 0 ? (
            <View style={{alignItems:'center', paddingVertical:40}}>
              <Text style={{color:'#9fb1a8', fontSize:16, textAlign:'center'}}>
                Aucun événement planifié cette semaine
              </Text>
              <Text style={{color:'#9fb1a8', fontSize:14, textAlign:'center', marginTop:8}}>
                Ajoutez des suppléments à votre planning pour voir les prises programmées
              </Text>
            </View>
          ) : (
            <View style={{gap:12}}>
              {calEvents
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map((event, index) => {
                  const eventDate = dayjs(event.start);
                  const isToday = eventDate.isSame(dayjs(), 'day');
                  const isPast = eventDate.isBefore(dayjs());
                  const isCompleted = event.title.includes('✅');
                  
                  return (
                    <Pressable
                      key={`${event.id}-${index}`}
                      onPress={() => onEventPress(event)}
                      style={{
                        backgroundColor: isToday ? '#1a3d2e' : '#1a1f2e',
                        padding:16,
                        borderRadius:12,
                        borderLeftWidth: 4,
                        borderLeftColor: isCompleted ? '#5ad06f' : THEME.green,
                        opacity: isPast && !isCompleted ? 0.6 : 1,
                      }}>
                      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                        <View style={{flex:1}}>
                          <Text style={{color:THEME.text, fontSize:16, fontWeight:'600', marginBottom:4}}>
                            {event.title}
                          </Text>
                          <Text style={{color:'#9fb1a8', fontSize:14}}>
                            {eventDate.format('dddd D MMMM')} à {eventDate.format('HH:mm')}
                          </Text>
                          {isToday && (
                            <Text style={{color:THEME.green, fontSize:12, fontWeight:'600', marginTop:4}}>
                              📅 Aujourd'hui
                            </Text>
                          )}
                        </View>
                        <View style={{alignItems:'center'}}>
                          {isCompleted ? (
                            <Text style={{color:'#5ad06f', fontSize:24}}>✅</Text>
                          ) : isPast ? (
                            <Text style={{color:'#ef4444', fontSize:20}}>⏰</Text>
                          ) : (
                            <Text style={{color:'#9fb1a8', fontSize:20}}>⏳</Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
            </View>
          )}
          
          <View style={{height:40}} />
        </ScrollView>
      )}
    </View>
  );
}

function Header({weekStart,onPrev,onNext}:{weekStart:dayjs.Dayjs; onPrev:()=>void; onNext:()=>void}) {
  const label = `${weekStart.format('D MMM')} – ${weekStart.add(6,'day').format('D MMM')}`;
  return (
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,paddingBottom:8}}>
      <Pressable onPress={onPrev}><Text style={{color:'#9fb1a8'}}>‹ Semaine</Text></Pressable>
      <Text style={{color:'#e9f0ec',fontSize:18,fontWeight:'700'}}>{label}</Text>
      <Pressable onPress={onNext}><Text style={{color:'#9fb1a8'}}>Semaine ›</Text></Pressable>
    </View>
  );
}