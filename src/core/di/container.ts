/**
 * Dependency Injection Container
 * Central place for creating and wiring dependencies
 * Following Dependency Inversion Principle
 */

import { StorageService } from '@/src/data/storage/StorageService';
import { ApiClient } from '@/src/data/api/ApiClient';

// Repository Implementations
import { AuthRepositoryImpl } from '@/src/data/repositories/AuthRepositoryImpl';
import { GameRepositoryImpl } from '@/src/data/repositories/GameRepositoryImpl';
import { StockRepositoryImpl } from '@/src/data/repositories/StockRepositoryImpl';
import { AdminRepositoryImpl } from '@/src/data/repositories/AdminRepositoryImpl';
import { ContestRepositoryImpl } from '@/src/data/repositories/ContestRepositoryImpl';

// Use Cases - Auth
import { LoginUseCase } from '@/src/domain/usecases/auth/LoginUseCase';
import { RegisterUseCase } from '@/src/domain/usecases/auth/RegisterUseCase';
import { LogoutUseCase } from '@/src/domain/usecases/auth/LogoutUseCase';
import { GetCurrentUserUseCase } from '@/src/domain/usecases/auth/GetCurrentUserUseCase';

// Use Cases - Game
import { StartGameUseCase } from '@/src/domain/usecases/game/StartGameUseCase';
import { GetActiveGamesUseCase } from '@/src/domain/usecases/game/GetActiveGamesUseCase';
import { GetGameHistoryUseCase } from '@/src/domain/usecases/game/GetGameHistoryUseCase';
import { CloseGameUseCase } from '@/src/domain/usecases/game/CloseGameUseCase';
import { CancelGameUseCase } from '@/src/domain/usecases/game/CancelGameUseCase';
import { GetLiveGameUseCase } from '@/src/domain/usecases/game/GetLiveGameUseCase';

// Use Cases - Stock
import { SearchStocksUseCase } from '@/src/domain/usecases/stock/SearchStocksUseCase';

// Use Cases - Admin
import { GetKiteLoginUrlUseCase } from '@/src/domain/usecases/admin/GetKiteLoginUrlUseCase';
import { HandleKiteCallbackUseCase } from '@/src/domain/usecases/admin/HandleKiteCallbackUseCase';
import { CheckKiteStatusUseCase } from '@/src/domain/usecases/admin/CheckKiteStatusUseCase';
import { GetAllUsersUseCase } from '@/src/domain/usecases/admin/GetAllUsersUseCase';
import { GetUserByIdUseCase } from '@/src/domain/usecases/admin/GetUserByIdUseCase';
import { GetUserByEmailUseCase } from '@/src/domain/usecases/admin/GetUserByEmailUseCase';

// Use Cases - Contest
import { ListContestsUseCase } from '@/src/domain/usecases/contest/ListContestsUseCase';
import { GetContestUseCase } from '@/src/domain/usecases/contest/GetContestUseCase';
import { JoinContestUseCase } from '@/src/domain/usecases/contest/JoinContestUseCase';
import { SubmitTeamUseCase } from '@/src/domain/usecases/contest/SubmitTeamUseCase';
import { GetMyTeamUseCase } from '@/src/domain/usecases/contest/GetMyTeamUseCase';
import { WithdrawFromContestUseCase } from '@/src/domain/usecases/contest/WithdrawFromContestUseCase';
import { GetLeaderboardUseCase } from '@/src/domain/usecases/contest/GetLeaderboardUseCase';
import { GetMyPerformanceUseCase } from '@/src/domain/usecases/contest/GetMyPerformanceUseCase';
import { GetMyContestsUseCase } from '@/src/domain/usecases/contest/GetMyContestsUseCase';

/**
 * Dependency Injection Container
 * Singleton pattern for managing dependencies
 */
class DIContainer {
  private static instance: DIContainer;

  // Infrastructure
  private readonly storageService: StorageService;
  private readonly apiClient: ApiClient;

  // Repositories
  private readonly authRepository: AuthRepositoryImpl;
  private readonly gameRepository: GameRepositoryImpl;
  private readonly stockRepository: StockRepositoryImpl;
  private readonly adminRepository: AdminRepositoryImpl;
  readonly contestRepository: ContestRepositoryImpl;

  // Use Cases - Auth
  readonly loginUseCase: LoginUseCase;
  readonly registerUseCase: RegisterUseCase;
  readonly logoutUseCase: LogoutUseCase;
  readonly getCurrentUserUseCase: GetCurrentUserUseCase;

  // Use Cases - Game
  readonly startGameUseCase: StartGameUseCase;
  readonly getActiveGamesUseCase: GetActiveGamesUseCase;
  readonly getGameHistoryUseCase: GetGameHistoryUseCase;
  readonly closeGameUseCase: CloseGameUseCase;
  readonly cancelGameUseCase: CancelGameUseCase;
  readonly getLiveGameUseCase: GetLiveGameUseCase;

  // Use Cases - Stock
  readonly searchStocksUseCase: SearchStocksUseCase;

  // Use Cases - Admin
  readonly getKiteLoginUrlUseCase: GetKiteLoginUrlUseCase;
  readonly handleKiteCallbackUseCase: HandleKiteCallbackUseCase;
  readonly checkKiteStatusUseCase: CheckKiteStatusUseCase;
  readonly getAllUsersUseCase: GetAllUsersUseCase;
  readonly getUserByIdUseCase: GetUserByIdUseCase;
  readonly getUserByEmailUseCase: GetUserByEmailUseCase;

  // Use Cases - Contest
  readonly listContestsUseCase: ListContestsUseCase;
  readonly getContestUseCase: GetContestUseCase;
  readonly joinContestUseCase: JoinContestUseCase;
  readonly submitTeamUseCase: SubmitTeamUseCase;
  readonly getMyTeamUseCase: GetMyTeamUseCase;
  readonly withdrawFromContestUseCase: WithdrawFromContestUseCase;
  readonly getLeaderboardUseCase: GetLeaderboardUseCase;
  readonly getMyPerformanceUseCase: GetMyPerformanceUseCase;
  readonly getMyContestsUseCase: GetMyContestsUseCase;

  private constructor() {
    // Initialize infrastructure
    this.storageService = new StorageService();
    this.apiClient = new ApiClient(this.storageService);

    // Initialize repositories
    this.authRepository = new AuthRepositoryImpl(this.apiClient, this.storageService);
    this.gameRepository = new GameRepositoryImpl(this.apiClient);
    this.stockRepository = new StockRepositoryImpl(this.apiClient);
    this.adminRepository = new AdminRepositoryImpl(this.apiClient);
    this.contestRepository = new ContestRepositoryImpl(this.apiClient);

    // Initialize use cases - Auth
    this.loginUseCase = new LoginUseCase(this.authRepository);
    this.registerUseCase = new RegisterUseCase(this.authRepository);
    this.logoutUseCase = new LogoutUseCase(this.authRepository);
    this.getCurrentUserUseCase = new GetCurrentUserUseCase(this.authRepository);

    // Initialize use cases - Game
    this.startGameUseCase = new StartGameUseCase(this.gameRepository);
    this.getActiveGamesUseCase = new GetActiveGamesUseCase(this.gameRepository);
    this.getGameHistoryUseCase = new GetGameHistoryUseCase(this.gameRepository);
    this.closeGameUseCase = new CloseGameUseCase(this.gameRepository);
    this.cancelGameUseCase = new CancelGameUseCase(this.gameRepository);
    this.getLiveGameUseCase = new GetLiveGameUseCase(this.gameRepository);

    // Initialize use cases - Stock
    this.searchStocksUseCase = new SearchStocksUseCase(this.stockRepository);

    // Initialize use cases - Admin
    this.getKiteLoginUrlUseCase = new GetKiteLoginUrlUseCase(this.adminRepository);
    this.handleKiteCallbackUseCase = new HandleKiteCallbackUseCase(this.adminRepository);
    this.checkKiteStatusUseCase = new CheckKiteStatusUseCase(this.adminRepository);
    this.getAllUsersUseCase = new GetAllUsersUseCase(this.adminRepository);
    this.getUserByIdUseCase = new GetUserByIdUseCase(this.adminRepository);
    this.getUserByEmailUseCase = new GetUserByEmailUseCase(this.adminRepository);

    // Initialize use cases - Contest
    this.listContestsUseCase = new ListContestsUseCase(this.contestRepository);
    this.getContestUseCase = new GetContestUseCase(this.contestRepository);
    this.joinContestUseCase = new JoinContestUseCase(this.contestRepository);
    this.submitTeamUseCase = new SubmitTeamUseCase(this.contestRepository);
    this.getMyTeamUseCase = new GetMyTeamUseCase(this.contestRepository);
    this.withdrawFromContestUseCase = new WithdrawFromContestUseCase(this.contestRepository);
    this.getLeaderboardUseCase = new GetLeaderboardUseCase(this.contestRepository);
    this.getMyPerformanceUseCase = new GetMyPerformanceUseCase(this.contestRepository);
    this.getMyContestsUseCase = new GetMyContestsUseCase(this.contestRepository);
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }
}

// Export singleton instance
export const container = DIContainer.getInstance();
