import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, Users, MapPin } from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { el } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface TrainerLesson {
  lesson_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  month: number;
  year: number;
  room_name: string;
  lesson_type: string;
  capacity: number;
  current_bookings: number;
}

export function TrainerDashboard() {
  const { profile } = useAuth();
  const [lessons, setLessons] = useState<TrainerLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchTrainerSchedule();
    }
  }, [profile]);

  const fetchTrainerSchedule = async () => {
    try {
      const { data, error } = await supabase
        .from('trainer_schedule')
        .select('*')
        .eq('trainer_id', profile?.id);

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching trainer schedule:', error);
      toast.error('Σφάλμα φόρτωσης προγράμματος');
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή'];
    return days[dayOfWeek];
  };

  const getLessonTypeName = (type: string) => {
    const types: Record<string, string> = {
      'pilates': 'Pilates',
      'personal-training-a': 'Personal Training A',
      'personal-training-b': 'Personal Training B',
      'kick-boxing': 'Kick Boxing',
      'free-gym': 'Ελεύθερη Γυμναστική',
    };
    return types[type] || type;
  };

  const todayLessons = lessons.filter(lesson => {
    const today = new Date().getDay();
    const adjustedToday = today === 0 ? 7 : today; // Sunday = 7
    return lesson.day_of_week === adjustedToday;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Καλώς ήρθατε, Προπονητή {profile?.first_name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Διαχειριστείτε το πρόγραμμά σας και τα μαθήματά σας
        </p>
      </div>

      {/* Today's Lessons */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-6 w-6 mr-2 text-blue-600" />
          Σημερινά Μαθήματα
        </h2>
        
        {todayLessons.length > 0 ? (
          <div className="grid gap-4">
            {todayLessons.map((lesson) => (
              <div key={lesson.lesson_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {getLessonTypeName(lesson.lesson_type)}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {lesson.room_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {lesson.start_time} - {lesson.end_time}
                    </p>
                    <p className="text-sm text-gray-600 flex items-center justify-end mt-1">
                      <Users className="h-4 w-4 mr-1" />
                      {lesson.current_bookings}/{lesson.capacity}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Δεν έχετε μαθήματα σήμερα</p>
          </div>
        )}
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Εβδομαδιαίο Πρόγραμμα</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((dayOfWeek) => {
            const dayLessons = lessons.filter(lesson => lesson.day_of_week === dayOfWeek);
            
            return (
              <div key={dayOfWeek} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-center">
                  {getDayName(dayOfWeek)}
                </h3>
                
                <div className="space-y-2">
                  {dayLessons.length > 0 ? (
                    dayLessons.map((lesson) => (
                      <div key={lesson.lesson_id} className="bg-blue-50 p-3 rounded-lg">
                        <p className="font-medium text-blue-900 text-sm">
                          {lesson.start_time} - {lesson.end_time}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {lesson.room_name}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {lesson.current_bookings}/{lesson.capacity} άτομα
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Κενό
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}