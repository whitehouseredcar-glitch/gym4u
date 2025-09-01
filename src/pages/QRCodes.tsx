import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Booking } from '../lib/supabase';
import { Download, Share2, Calendar, Clock, MapPin } from 'lucide-react';
import QRCode from 'qrcode.react';
import toast from 'react-hot-toast';

interface BookingWithDetails extends Booking {
  lesson: {
    start_time: string;
    end_time: string;
    day_of_week: number;
    room: {
      name: string;
      lesson_type: string;
    };
  };
}

export function QRCodes() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchBookings();
    }
  }, [profile]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          lesson:lessons(
            start_time,
            end_time,
            day_of_week,
            room:rooms(
              name,
              lesson_type
            )
          )
        `)
        .eq('user_id', profile?.id)
        .eq('status', 'confirmed')
        .gte('booking_date', new Date().toISOString().split('T')[0])
        .order('booking_date', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Σφάλμα φόρτωσης κρατήσεων');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = (qrCode: string, lessonName: string) => {
    const canvas = document.createElement('canvas');
    const qrSize = 256;
    canvas.width = qrSize;
    canvas.height = qrSize;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Generate QR code on canvas
    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);
    
    // Create a temporary React component to render QR code
    const qrElement = document.createElement('canvas');
    qrElement.width = qrSize;
    qrElement.height = qrSize;
    
    // Download the canvas as PNG
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-code-${lessonName.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('QR Code λήφθηκε!');
      }
    });
    
    document.body.removeChild(tempDiv);
  };

  const shareQRCode = async (qrCode: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FreeGym QR Code',
          text: `Το QR Code μου για το γυμναστήριο: ${qrCode}`,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(qrCode);
      toast.success('QR Code αντιγράφηκε στο clipboard!');
    }
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">QR Codes</h1>
        <p className="text-gray-600 mt-2">
          Χρησιμοποιήστε τα QR codes για check-in και check-out στο γυμναστήριο
        </p>
      </div>

      {bookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <QRCode 
                    value={booking.qr_code} 
                    size={150}
                    level="M"
                    includeMargin={true}
                  />
                </div>
              </div>

              {/* Lesson Details */}
              <div className="space-y-2 mb-4">
                <h3 className="font-semibold text-gray-900 text-center">
                  {getLessonTypeName(booking.lesson.room.lesson_type)}
                </h3>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(booking.booking_date).toLocaleDateString('el-GR')}</span>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{booking.lesson.start_time} - {booking.lesson.end_time}</span>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{booking.lesson.room.name}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => downloadQRCode(booking.qr_code, booking.lesson.room.name)}
                  className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Λήψη</span>
                </button>
                
                <button
                  onClick={() => shareQRCode(booking.qr_code)}
                  className="flex-1 bg-gray-600 text-white py-2 px-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Μοιρασμός</span>
                </button>
              </div>

              {/* Booking Status */}
              <div className="mt-3 text-center">
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                  Επιβεβαιωμένη
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Δεν έχετε κρατήσεις
          </h3>
          <p className="text-gray-600 mb-6">
            Κλείστε ένα μάθημα για να δείτε το QR code σας
          </p>
          <button
            onClick={() => window.location.href = '/bookings'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Κλείστε Μάθημα
          </button>
        </div>
      )}
    </div>
  );
}