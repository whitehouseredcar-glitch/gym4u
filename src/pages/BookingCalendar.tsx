import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Lesson, Booking, Membership } from '../lib/supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  Star,
  AlertCircle
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { el } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface LessonWithBookings extends Lesson {
  current_bookings: number;
  user_booking?: Booking;
}

export function BookingCalendar() {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState<LessonWithBookings[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchCalendarData();
    }
  }, [profile, currentDate]);

  const fetchCalendarData = async () => {
    try {
      // Fetch user's membership
      const { data: membershipData } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('status', 'active')
        .single();

      setMembership(membershipData);

      // Fetch lessons for current month
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          *,
          room:rooms(name, lesson_type, capacity),
          trainer:profiles(first_name, last_name)
        `)
        .eq('month', currentDate.getMonth() + 1)
        .eq('year', currentDate.getFullYear())
        .eq('is_active', true);

      if (lessonsError) throw lessonsError;

      // Fetch user's bookings for current month
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', profile?.id)
        .gte('booking_date', `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`)
        .lt('booking_date', `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 2).padStart(2, '0')}-01`);

      // Fetch booking counts for each lesson
      const lessonsWithBookings = await Promise.all(
        (lessonsData || []).map(async (lesson) => {
          const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('lesson_id', lesson.id)
            .eq('status', 'confirmed');

          const userBooking = bookingsData?.find(b => b.lesson_id === lesson.id);

          return {
            ...lesson,
            current_bookings: count || 0,
            user_booking: userBooking,
          };
        })
      );

      setLessons(lessonsWithBookings);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Σφάλμα φόρτωσης ημερολογίου');
    } finally {
      setLoading(false);
    }
  };

  const handleBookLesson = async (lesson: LessonWithBookings, date: Date) => {
    if (!membership) {
      toast.error('Χρειάζεστε ενεργή συνδρομή για κράτηση');
      return;
    }

    if (membership.credits_remaining <= 0) {
      toast.error('Δεν έχετε αρκετές πιστώσεις');
      return;
    }

    if (lesson.current_bookings >= lesson.room!.capacity) {
      toast.error('Το μάθημα είναι πλήρες');
      return;
    }

    if (lesson.user_booking) {
      toast.error('Έχετε ήδη κρατήσει αυτό το μάθημα');
      return;
    }

    try {
      // Generate QR code
      const qrCode = `${profile?.id}-${lesson.id}-${date.getTime()}`;

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: profile?.id,
          lesson_id: lesson.id,
          booking_date: format(date, 'yyyy-MM-dd'),
          qr_code: qrCode,
          status: 'confirmed',
        });

      if (bookingError) throw bookingError;

      // Decrement credits
      const { error: creditError } = await supabase.rpc('decrement_credits', {
        p_user_id: profile?.id,
        decrement_amount: 1,
      });

      if (creditError) throw creditError;

      toast.success('Επιτυχής κράτηση!');
      fetchCalendarData(); // Refresh data
    } catch (error) {
      console.error('Error booking lesson:', error);
      toast.error('Σφάλμα κράτησης');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const { error: cancelError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (cancelError) throw cancelError;

      // Increment credits back
      const { error: creditError } = await supabase.rpc('increment_credits', {
        p_user_id: profile?.id,
        increment_amount: 1,
      });

      if (creditError) throw creditError;

      toast.success('Κράτηση ακυρώθηκε');
      fetchCalendarData(); // Refresh data
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Σφάλμα ακύρωσης');
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Κρατήσεις Μαθημάτων</h1>
          <p className="text-gray-600 mt-2">
            Κλείστε τα μαθήματά σας για τον μήνα
          </p>
        </div>
        
        {membership && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-gray-900">
                {membership.credits_remaining} πιστώσεις
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Λήξη: {new Date(membership.expires_at).toLocaleDateString('el-GR')}
            </p>
          </div>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentDate, 'MMMM yyyy', { locale: el })}
        </h2>
        
        <button
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Membership Warning */}
      {!membership && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Χρειάζεστε ενεργή συνδρομή</p>
              <p className="text-sm text-amber-700">
                Για να κλείσετε μαθήματα, πρέπει πρώτα να αγοράσετε ένα πακέτο συνδρομής.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-5 gap-0">
          {weekDays.map((day, dayIndex) => {
            const dayLessons = lessons.filter(lesson => lesson.day_of_week === dayIndex + 1);
            
            return (
              <div key={day.toISOString()} className="border-r border-gray-200 last:border-r-0">
                <div className="bg-gray-50 p-4 text-center border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">
                    {format(day, 'EEEE', { locale: el })}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(day, 'd MMM', { locale: el })}
                  </p>
                </div>
                
                <div className="p-4 space-y-3 min-h-[400px]">
                  {dayLessons.map((lesson) => {
                    const isBooked = !!lesson.user_booking;
                    const isFull = lesson.current_bookings >= lesson.room!.capacity;
                    const canBook = membership && membership.credits_remaining > 0 && !isBooked && !isFull;
                    
                    return (
                      <div
                        key={lesson.id}
                        className={`border rounded-lg p-3 transition-all ${
                          isBooked ? 'bg-green-50 border-green-200' :
                          isFull ? 'bg-red-50 border-red-200' :
                          'bg-gray-50 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900 text-sm">
                              {getLessonTypeName(lesson.room!.lesson_type)}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              lesson.current_bookings >= lesson.room!.capacity ? 
                              'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {lesson.current_bookings}/{lesson.room!.capacity}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span>{lesson.start_time} - {lesson.end_time}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            <span>{lesson.room!.name}</span>
                          </div>

                          {isBooked ? (
                            <button
                              onClick={() => handleCancelBooking(lesson.user_booking!.id)}
                              className="w-full bg-red-600 text-white text-xs py-2 rounded-md hover:bg-red-700 transition-colors"
                            >
                              Ακύρωση
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBookLesson(lesson, day)}
                              disabled={!canBook}
                              className={`w-full text-xs py-2 rounded-md transition-colors ${
                                canBook
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {isFull ? 'Πλήρες' : 'Κράτηση'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {dayLessons.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      Δεν υπάρχουν μαθήματα
                    </div>
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